"""
Messages API – stores end-to-end encrypted messages.
The server never sees plaintext; it only stores ciphertext + nonce.
Encryption/decryption happens entirely on the client using NaCl box.
"""
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, or_, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models import Connection, ConnectionStatus, Message, User
from app.schemas import MessageCreate, MessageOut

router = APIRouter(prefix="/messages", tags=["messages"])


async def _assert_connected(db: AsyncSession, user_a: uuid.UUID, user_b: uuid.UUID) -> None:
    """Ensure two users have an accepted connection before they can message."""
    result = await db.execute(
        select(Connection).where(
            or_(
                and_(
                    Connection.requester_id == user_a,
                    Connection.addressee_id == user_b,
                    Connection.status == ConnectionStatus.accepted,
                ),
                and_(
                    Connection.requester_id == user_b,
                    Connection.addressee_id == user_a,
                    Connection.status == ConnectionStatus.accepted,
                ),
            )
        )
    )
    if not result.scalars().first():
        raise HTTPException(
            status_code=403,
            detail="You must be connected to send messages",
        )


@router.post("/", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def send_message(
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.recipient_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    result = await db.execute(select(User).where(User.id == payload.recipient_id))
    recipient = result.scalars().first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    await _assert_connected(db, current_user.id, payload.recipient_id)

    msg = Message(
        sender_id=current_user.id,
        recipient_id=payload.recipient_id,
        ciphertext=payload.ciphertext,
        nonce=payload.nonce,
    )
    db.add(msg)
    await db.commit()

    result = await db.execute(
        select(Message)
        .options(selectinload(Message.sender))
        .where(Message.id == msg.id)
    )
    return result.scalars().first()


@router.get("/conversation/{other_user_id}", response_model=List[MessageOut])
async def get_conversation(
    other_user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _assert_connected(db, current_user.id, other_user_id)

    result = await db.execute(
        select(Message)
        .options(selectinload(Message.sender))
        .where(
            or_(
                and_(
                    Message.sender_id == current_user.id,
                    Message.recipient_id == other_user_id,
                ),
                and_(
                    Message.sender_id == other_user_id,
                    Message.recipient_id == current_user.id,
                ),
            )
        )
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    # Mark incoming messages as read
    await db.execute(
        update(Message)
        .where(
            Message.sender_id == other_user_id,
            Message.recipient_id == current_user.id,
            Message.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await db.commit()
    return messages


@router.get("/inbox", response_model=List[MessageOut])
async def inbox(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Message)
        .options(selectinload(Message.sender))
        .where(Message.recipient_id == current_user.id)
        .order_by(Message.created_at.desc())
    )
    return result.scalars().all()
