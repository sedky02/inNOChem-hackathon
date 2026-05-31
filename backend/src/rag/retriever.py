"""Lightweight RAG retriever over the scientific-literature ChromaDB store.

Optional: if chromadb / sentence-transformers / the persisted store are absent,
`retrieve_citations` returns an empty list so screening still works. The
persisted vector store is built by `scripts/build_rag_index.py`.
"""

from __future__ import annotations

import os

from src.config.settings import settings

_COLLECTION = "greendye_literature"


def _chroma_path() -> str:
    return os.environ.get("CHROMA_DB_PATH", "./chroma_db")


def retrieve_citations(query: str, k: int = 3) -> list[str]:
    """Return up to k short source citations relevant to the query, or []."""
    try:
        import chromadb
    except Exception:
        return []
    path = _chroma_path()
    if not os.path.isdir(path):
        return []
    try:
        client = chromadb.PersistentClient(path=path)
        collection = client.get_collection(_COLLECTION)
        res = collection.query(query_texts=[query], n_results=k)
        metadatas = (res.get("metadatas") or [[]])[0]
        docs = (res.get("documents") or [[]])[0]
        citations: list[str] = []
        for meta, doc in zip(metadatas, docs):
            src = (meta or {}).get("source") if isinstance(meta, dict) else None
            citations.append(src or (doc[:120] if doc else "source"))
        return citations
    except Exception:
        return []
