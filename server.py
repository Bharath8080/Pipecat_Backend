import logging
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import config
from bot import run_bot

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("server")

app = FastAPI(title="Pipecat Real-Time AI Voice Chat")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

frontend_dir = Path(__file__).parent / "frontend"


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established.")
    try:
        await run_bot(websocket)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected.")
    except Exception as e:
        logger.error(f"Pipecat bot error: {e}")


@app.get("/")
async def get_index():
    return FileResponse(frontend_dir / "index.html")


@app.get("/app.jsx")
async def get_app_jsx():
    return FileResponse(frontend_dir / "app.jsx", media_type="text/javascript")


if __name__ == "__main__":
    uvicorn.run("server:app", host=config.HOST, port=config.PORT, reload=True)
