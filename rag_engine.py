import os
import shutil
from typing import List, Dict, Any
from loguru import logger

from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter

FAISS_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "faiss_index")
UPLOAD_STORAGE_DIR = os.path.join(os.path.dirname(__file__), "uploaded_docs")
os.makedirs(UPLOAD_STORAGE_DIR, exist_ok=True)

# 1. FastEmbed Embeddings & Text Splitter
embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-base-en-v1.5")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

# 2. Vector Store
vector_store: FAISS | None = None

if os.path.exists(os.path.join(FAISS_PERSIST_DIR, "index.faiss")):
    try:
        vector_store = FAISS.load_local(FAISS_PERSIST_DIR, embeddings, allow_dangerous_deserialization=True)
        logger.info("✅ Loaded existing FAISS index from disk.")
    except Exception:
        vector_store = None


def ingest_pdf(file_path: str, filename: str) -> Dict[str, Any]:
    global vector_store
    logger.info(f"Ingesting PDF: {filename}")

    loader = PyPDFLoader(file_path=file_path)
    docs = loader.load()
    for doc in docs:
        doc.metadata["filename"] = filename

    chunks = text_splitter.split_documents(docs)

    if vector_store is None:
        vector_store = FAISS.from_documents(chunks, embeddings)
    else:
        vector_store.add_documents(chunks)

    vector_store.save_local(FAISS_PERSIST_DIR)
    logger.info(f"✅ Indexed {len(chunks)} chunks for '{filename}'.")

    return {
        "status": "success",
        "filename": filename,
        "chunks": len(chunks),
        "total_documents": len(list_indexed_documents()),
    }


def retrieve_context(query: str, top_k: int = 3) -> str:
    if vector_store is None:
        return "No uploaded documents available."
    try:
        docs = vector_store.similarity_search(query, k=top_k)
        return "\n\n".join(d.page_content.strip() for d in docs) if docs else "No relevant information found."
    except Exception as e:
        logger.error(f"Retrieval error: {e}")
        return "No relevant information found."


def list_indexed_documents() -> List[str]:
    if vector_store is None:
        return []
    try:
        return sorted(
            list(
                {
                    doc.metadata.get("filename")
                    for doc in vector_store.docstore._dict.values()
                    if hasattr(doc, "metadata") and doc.metadata.get("filename")
                }
            )
        )
    except Exception:
        return []


def clear_knowledge_base() -> Dict[str, Any]:
    global vector_store
    vector_store = None
    if os.path.exists(FAISS_PERSIST_DIR):
        shutil.rmtree(FAISS_PERSIST_DIR, ignore_errors=True)
    if os.path.exists(UPLOAD_STORAGE_DIR):
        shutil.rmtree(UPLOAD_STORAGE_DIR, ignore_errors=True)
    os.makedirs(UPLOAD_STORAGE_DIR, exist_ok=True)
    logger.info("✅ FAISS knowledge base cleared.")
    return {"status": "cleared", "total_documents": 0}
