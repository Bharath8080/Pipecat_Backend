import os
import shutil
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

import rag_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="Pipecat Real-Time Voice RAG Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Uploads and indexes a PDF document into the ChromaDB vector store using LangChain."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported.")

    file_path = os.path.join(rag_engine.UPLOAD_STORAGE_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = rag_engine.ingest_pdf(file_path=file_path, filename=file.filename)
        return result
    except Exception as e:
        logger.error(f"Error processing PDF upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")


@app.get("/api/documents")
async def get_documents():
    """Lists all active documents currently indexed in the knowledge base."""
    docs = rag_engine.list_indexed_documents()
    return {"documents": docs, "count": len(docs)}


@app.delete("/api/documents")
async def delete_documents():
    """Clears all indexed documents from the ChromaDB knowledge base."""
    return rag_engine.clear_knowledge_base()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client WebSocket connected to /ws")
    from bot import run_bot

    try:
        await run_bot(websocket)
    except WebSocketDisconnect:
        logger.info("Client WebSocket disconnected.")
    except Exception as e:
        logger.error(f"Pipecat bot exception: {e}")


# Serve production frontend bundle if built
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_excludes=["faiss_index/*", "qdrant_db/*", "uploaded_docs/*", "frontend/*", "chroma_db/*", "*.log"],
    )
