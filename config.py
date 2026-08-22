import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "").strip()

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8000))

# Groq Model Configuration
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
GROQ_STT_MODEL = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")

# Cartesia Sonic Voice Configuration
DEFAULT_VOICE_ID = os.getenv("CARTESIA_VOICE_ID", "e07c00bc-4134-4eae-9ea4-1a55fb45746b")
CARTESIA_MODEL_ID = "sonic-latest"

# Conversational System Prompt for fast voice assistant responses
DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful, witty, and concise real-time voice assistant. "
    "Your responses will be spoken aloud to the user using text-to-speech. "
    "Keep your answers brief, natural, conversational, and direct (1 to 2 sentences max). "
    "Avoid bullet points, long lists, markdown formatting, emojis, or code blocks unless explicitly requested."
)
