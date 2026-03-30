from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import Connection, ConnectionStatus, User
from app.schemas import ConnectionRequest, ConnectionAction, ConnectionOut

router = APIRouter(prefix="/connections", tags=["connections"])


@router.post("/", response_model=ConnectionOut, status_code=status.HTTP_201_CREATED)
async def send_request(
    payload: ConnectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.addressee_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot connect to yourself")

    # Check addressee exists
    result = await db.execute(select(User).where(User.id == payload.addressee_id))
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="User not found")

    # Check existing connection
    existing = await db.execute(
        select(Connection).where(
            or_(
                and_(
                    Connection.requester_id == current_user.id,
                    Connection.addressee_id == payload.addressee_id,
                ),
                and_(
                    Connection.requester_id == payload.addressee_id,
                    Connection.addressee_id == current_user.id,
                ),
            )
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Connection already exists")

    conn = Connection(requester_id=current_user.id, addressee_id=payload.addressee_id)
    db.add(conn)
    await db.commit()
    result = await db.execute(
        select(Connection)
        .options(selectinload(Connection.requester), selectinload(Connection.addressee))
        .where(Connection.id == conn.id)
    )
    return result.scalars().first()


@router.get("/", response_model=List[ConnectionOut])
async def list_connections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Connection)
        .options(selectinload(Connection.requester), selectinload(Connection.addressee))
        .where(
            or_(
                Connection.requester_id == current_user.id,
                Connection.addressee_id == current_user.id,
            )
        )
    )
    return result.scalars().all()


@router.patch("/{connection_id}", response_model=ConnectionOut)
async def respond_to_request(
    connection_id: uuid.UUID,
    payload: ConnectionAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Connection)
        .options(selectinload(Connection.requester), selectinload(Connection.addressee))
        .where(Connection.id == connection_id)
    )
    conn = result.scalars().first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    if conn.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if conn.status != ConnectionStatus.pending:
        raise HTTPException(status_code=400, detail="Connection already resolved")

    allowed = {s.value for s in ConnectionStatus} - {"pending"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {allowed}")

    conn.status = ConnectionStatus(payload.status)
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn


@router.delete("/{connection_id}", status_code=204)
async def remove_connection(
    connection_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    conn = result.scalars().first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    if conn.requester_id != current_user.id and conn.addressee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.delete(conn)
    await db.commit()
