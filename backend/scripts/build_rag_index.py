"""Build the ChromaDB literature index from PDFs in data/papers/.

Optional pipeline step. Requires chromadb + pypdf. Skips gracefully if either
the dependencies or the papers directory are missing.

Run: `python -m scripts.build_rag_index`
"""

from __future__ import annotations

import os

PAPERS_DIR = os.environ.get("PAPERS_DIR", "data/papers")
COLLECTION = "greendye_literature"


def build() -> None:
    try:
        import chromadb
        from pypdf import PdfReader
    except Exception:
        print("chromadb / pypdf not installed — skipping RAG index build.")
        return
    if not os.path.isdir(PAPERS_DIR):
        print(f"No papers directory at {PAPERS_DIR} — skipping.")
        return

    client = chromadb.PersistentClient(path=os.environ.get("CHROMA_DB_PATH", "./chroma_db"))
    collection = client.get_or_create_collection(COLLECTION)

    docs, ids, metas = [], [], []
    for fname in os.listdir(PAPERS_DIR):
        if not fname.lower().endswith(".pdf"):
            continue
        try:
            reader = PdfReader(os.path.join(PAPERS_DIR, fname))
        except Exception:
            continue
        for page_no, page in enumerate(reader.pages):
            text = (page.extract_text() or "").strip()
            if len(text) < 100:
                continue
            docs.append(text[:2000])
            ids.append(f"{fname}-p{page_no}")
            metas.append({"source": f"{fname} (p.{page_no + 1})"})

    if docs:
        collection.upsert(documents=docs, ids=ids, metadatas=metas)
        print(f"Indexed {len(docs)} passages into '{COLLECTION}'.")
    else:
        print("No extractable text found in papers.")


if __name__ == "__main__":
    build()
