"""
Embedding service using sentence-transformers.
Generates 384-dimensional vectors for task text.
"""
from functools import lru_cache
from typing import List

from sentence_transformers import SentenceTransformer

from app.config import settings


@lru_cache(maxsize=1)
def _get_model() -> SentenceTransformer:
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed_text(text: str) -> List[float]:
    model = _get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()


def embed_task(title: str, description: str, tags: str | None = None) -> List[float]:
    parts = [title, description]
    if tags:
        parts.append(tags)
    combined = " | ".join(parts)
    return embed_text(combined)
