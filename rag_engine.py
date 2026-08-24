import os
from typing import List, Dict, Any
from loguru import logger

from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
UPLOAD_STORAGE_DIR = os.path.join(os.path.dirname(__file__), "uploaded_docs")
os.makedirs(UPLOAD_STORAGE_DIR, exist_ok=True)

embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-base-en-v1.5")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

vector_store = Chroma(
    collection_name="rag_docs",
    embedding_function=embeddings,
    persist_directory=CHROMA_PERSIST_DIR,
)


def ingest_pdf(file_path: str, filename: str) -> Dict[str, Any]:
    logger.info(f"Ingesting PDF: {filename}")

    docs = PyPDFLoader(file_path=file_path).load()
    for doc in docs:
        doc.metadata["filename"] = filename

    chunks = text_splitter.split_documents(docs)
    vector_store.add_documents(chunks)

    logger.info(f"✅ Indexed {len(chunks)} chunks for '{filename}'.")
    return {
        "status": "success",
        "filename": filename,
        "chunks": len(chunks),
        "total_documents": len(list_indexed_documents()),
    }


def retrieve_context(query: str, top_k: int = 3) -> str:
    try:
        docs = vector_store.similarity_search(query, k=top_k)
        return "\n\n".join(d.page_content.strip() for d in docs) if docs else "No relevant information found."
    except Exception as e:
        logger.error(f"Retrieval error: {e}")
        return "No relevant information found."


def list_indexed_documents() -> List[str]:
    try:
        results = vector_store.get(include=["metadatas"])
        filenames = {m.get("filename") for m in results["metadatas"] if m.get("filename")}
        return sorted(filenames)
    except Exception:
        return []


def clear_knowledge_base() -> Dict[str, Any]:
    try:
        vector_store.delete_collection()
    except Exception:
        pass
    logger.info("✅ ChromaDB knowledge base cleared.")
    return {"status": "cleared", "total_documents": 0}
