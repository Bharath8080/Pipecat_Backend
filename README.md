# Real-Time AI Voice Chatbot (Pipecat + Cartesia + Mistral)

A real-time, low-latency conversational voice chatbot built with **FastAPI WebSockets**, **Pipecat AI**, **Cartesia Sonic TTS**, **Cartesia STT**, **Silero VAD**, and **Mistral AI**.

---

## ⚡ Features
- **Pipecat AI Pipeline**: Industry-standard conversational audio orchestration.
- **Ultra-Low Latency**: Cartesia Sonic TTS + Mistral LLM streaming for sub-second responses.
- **Bi-directional WebSockets**: Direct 16kHz Int16 PCM streaming between browser and backend.
- **Silero VAD**: Automatic speech detection and natural interruption / barge-in support.
- **Minimalist Web UI**: Responsive React interface with live audio waveform and conversation display.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your API keys:
```ini
CARTESIA_API_KEY=your_cartesia_api_key
MISTRAL_API_KEY=your_mistral_api_key
```

### 3. Run Locally
```bash
python server.py
```
Then open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser and click **Start Conversation**.

---

## 🌐 Deploying to FastAPI Cloud
```bash
fastapi deploy
```
