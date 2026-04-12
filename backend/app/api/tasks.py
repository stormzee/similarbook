from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.embeddings import embed_task
from app.db.database import get_db
from app.models import Task, User
from app.schemas import TaskCreate, TaskOut, TaskUpdate, SimilarTask

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    embedding = embed_task(payload.title, payload.description, payload.tags)
    task = Task(
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        tags=payload.tags,
        is_public=payload.is_public,
        embedding=embedding,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    # Load owner
    result = await db.execute(
        select(Task).options(selectinload(Task.owner)).where(Task.id == task.id)
    )
    return result.scalars().first()


@router.get("/feed", response_model=List[TaskOut])
async def get_feed(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.owner))
        .where(Task.is_public == True)
        .order_by(Task.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/my", response_model=List[TaskOut])
async def get_my_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task)
        .options(selectinload(Task.owner))
        .where(Task.owner_id == current_user.id)
        .order_by(Task.created_at.desc())
    )
    return result.scalars().all()


@router.get("/search/similar", response_model=List[SimilarTask])
async def search_similar(
    q: str = Query(..., min_length=3),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search for tasks similar to the query string using pgvector cosine similarity."""
    from pgvector.sqlalchemy import Vector
    from sqlalchemy import cast, text

    query_embedding = embed_task(q, q)
    vector_literal = "[" + ",".join(str(v) for v in query_embedding) + "]"

    # Use pgvector cosine distance operator (<=>)
    rows = await db.execute(
        text(
            """
            SELECT t.id, 1 - (t.embedding <=> CAST(:vec AS vector)) AS similarity
            FROM tasks t
            WHERE t.is_public = true AND t.embedding IS NOT NULL
            ORDER BY t.embedding <=> CAST(:vec AS vector)
            LIMIT :lim
            """
        ),
        {"vec": vector_literal, "lim": limit},
    )
    sim_rows = rows.fetchall()

    if not sim_rows:
        return []

    ids = [r[0] for r in sim_rows]
    sim_map = {r[0]: float(r[1]) for r in sim_rows}

    task_result = await db.execute(
        select(Task).options(selectinload(Task.owner)).where(Task.id.in_(ids))
    )
    tasks = {t.id: t for t in task_result.scalars().all()}

    return [
        SimilarTask(task=tasks[tid], similarity=sim_map[tid])
        for tid in ids
        if tid in tasks
    ]


@router.get("/similar-to/{task_id}", response_model=List[SimilarTask])
async def similar_to_task(
    task_id: uuid.UUID,
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return tasks similar to a given task by ID."""
    result = await db.execute(select(Task).where(Task.id == task_id))
    source = result.scalars().first()
    if not source:
        raise HTTPException(status_code=404, detail="Task not found")
    if not source.embedding:
        raise HTTPException(status_code=422, detail="Task has no embedding")

    vector_literal = "[" + ",".join(str(v) for v in source.embedding) + "]"
    rows = await db.execute(
        text(
            """
            SELECT t.id, 1 - (t.embedding <=> CAST(:vec AS vector)) AS similarity
            FROM tasks t
            WHERE t.is_public = true AND t.embedding IS NOT NULL AND t.id != :tid
            ORDER BY t.embedding <=> CAST(:vec AS vector)
            LIMIT :lim
            """
        ),
        {"vec": vector_literal, "tid": str(task_id), "lim": limit},
    )
    sim_rows = rows.fetchall()
    if not sim_rows:
        return []

    ids = [r[0] for r in sim_rows]
    sim_map = {r[0]: float(r[1]) for r in sim_rows}

    task_result = await db.execute(
        select(Task).options(selectinload(Task.owner)).where(Task.id.in_(ids))
    )
    tasks = {t.id: t for t in task_result.scalars().all()}

    return [
        SimilarTask(task=tasks[tid], similarity=sim_map[tid])
        for tid in ids
        if tid in tasks
    ]


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).options(selectinload(Task.owner)).where(Task.id == task_id)
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if not task.is_public and task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return task


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task")

    changed_text = False
    if payload.title is not None:
        task.title = payload.title
        changed_text = True
    if payload.description is not None:
        task.description = payload.description
        changed_text = True
    if payload.tags is not None:
        task.tags = payload.tags
        changed_text = True
    if payload.is_public is not None:
        task.is_public = payload.is_public
    if payload.is_completed is not None:
        task.is_completed = payload.is_completed

    if changed_text:
        task.embedding = embed_task(task.title, task.description, task.tags)

    db.add(task)
    await db.commit()

    result = await db.execute(
        select(Task).options(selectinload(Task.owner)).where(Task.id == task.id)
    )
    return result.scalars().first()


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your task")
    await db.delete(task)
    await db.commit()
