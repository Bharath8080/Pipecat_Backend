import os
import uuid
from typing import List, Dict, Any
from loguru import logger

from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore, FastEmbedSparse, RetrievalMode
from qdrant_client import QdrantClient
from qdrant_client.http import models

QDRANT_PATH = os.path.join(os.path.dirname(__file__), "qdrant_db")
UPLOAD_STORAGE_DIR = os.path.join(os.path.dirname(__file__), "uploaded_docs")
COLLECTION_NAME = "rag_docs"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100

os.makedirs(UPLOAD_STORAGE_DIR, exist_ok=True)

# Dense + Sparse embeddings for Hybrid Search
_dense = FastEmbedEmbeddings(model_name="BAAI/bge-base-en-v1.5")
_sparse = FastEmbedSparse(model_name="Qdrant/bm25")
_client = QdrantClient(path=QDRANT_PATH)


def _ensure_collection():
    if not _client.collection_exists(COLLECTION_NAME):
        _client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=768, distance=models.Distance.COSINE),
            sparse_vectors_config={
                "langchain-sparse": models.SparseVectorParams()
            },
        )


def get_text_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " "],
    )


def _store() -> QdrantVectorStore:
    _ensure_collection()
    return QdrantVectorStore(
        client=_client,
        collection_name=COLLECTION_NAME,
        embedding=_dense,
        sparse_embedding=_sparse,
        retrieval_mode=RetrievalMode.HYBRID,
    )


def _chunk_id(filename: str, idx: int, text: str) -> str:
    """Deterministic UUID5 — prevents duplicate chunks when re-indexing."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{filename}:{idx}:{text[:200]}"))


def ingest_pdf(file_path: str, filename: str) -> Dict[str, Any]:
    logger.info(f"Ingesting PDF: {filename}")

    docs = PyPDFLoader(file_path=file_path).load()
    for doc in docs:
        doc.metadata["filename"] = filename

    chunks = get_text_splitter().split_documents(docs)
    ids = [_chunk_id(filename, i, c.page_content) for i, c in enumerate(chunks)]

    _store().add_documents(chunks, ids=ids)

    logger.info(f"✅ Indexed {len(chunks)} chunks for '{filename}'.")
    return {
        "status": "success",
        "filename": filename,
        "chunks": len(chunks),
        "total_documents": len(list_indexed_documents()),
    }


def retrieve_context(query: str, top_k: int = 3) -> str:
    if not _client.collection_exists(COLLECTION_NAME):
        return "No uploaded documents available."
    try:
        # BGE models require this instruction on the query side for better recall
        bge_query = f"Represent this sentence for searching relevant passages: {query}"
        docs = _store().similarity_search(bge_query, k=top_k)
        return "\n\n".join(d.page_content.strip() for d in docs) if docs else "No relevant information found."
    except Exception as e:
        logger.error(f"Retrieval error: {e}")
        return "No relevant information found."


def list_indexed_documents() -> List[str]:
    if not _client.collection_exists(COLLECTION_NAME):
        return []
    try:
        points, _ = _client.scroll(COLLECTION_NAME, limit=1000, with_payload=True)
        filenames = {
            p.payload.get("metadata", {}).get("filename")
            for p in points
            if p.payload
        }
        return sorted(f for f in filenames if f)
    except Exception:
        return []


def clear_knowledge_base() -> Dict[str, Any]:
    if _client.collection_exists(COLLECTION_NAME):
        _client.delete_collection(COLLECTION_NAME)
    if os.path.exists(UPLOAD_STORAGE_DIR):
        for f in os.listdir(UPLOAD_STORAGE_DIR):
            fp = os.path.join(UPLOAD_STORAGE_DIR, f)
            if os.path.isfile(fp):
                try:
                    os.remove(fp)
                except Exception:
                    pass
    logger.info("✅ Qdrant knowledge base cleared.")
    return {"status": "cleared", "total_documents": 0}
