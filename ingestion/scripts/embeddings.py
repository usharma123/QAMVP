"""384-dim embeddings via sentence-transformers (offline-friendly)."""

from __future__ import annotations

import os
from functools import lru_cache

EMBEDDING_DIM = 384
MODEL_NAME = os.environ.get("ST_MODEL_NAME", "all-MiniLM-L6-v2")


@lru_cache(maxsize=1)
def _model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(MODEL_NAME)


def embed_texts(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    if not texts:
        return []
    model = _model()
    vectors = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 16,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )
    return [v.tolist() for v in vectors]


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
