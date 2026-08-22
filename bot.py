import sys
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import EndFrame, Frame, InputAudioRawFrame, LLMRunFrame, OutputAudioRawFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.serializers.base_serializer import FrameSerializer
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.groq.llm import GroqLLMService
from pipecat.services.groq.stt import GroqSTTService
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

import config

logger.remove()
logger.add(sys.stderr, level="INFO")


class RawAudioSerializer(FrameSerializer):
    """Serializes output audio frames to raw PCM bytes and deserializes incoming mic PCM bytes."""

    async def serialize(self, frame: Frame) -> str | bytes | None:
        if isinstance(frame, OutputAudioRawFrame):
            return frame.audio
        return None

    async def deserialize(self, data: str | bytes) -> Frame | None:
        if isinstance(data, bytes):
            return InputAudioRawFrame(
                audio=data,
                num_channels=1,
                sample_rate=16000,
            )
        return None


async def run_bot(websocket_client):
    """
    Runs the Pipecat real-time conversational voice pipeline:
    - STT: Groq Whisper Large v3 Turbo (Ultra-low latency, generous free tier)
    - LLM: Groq openai/gpt-oss-20b (Ultra-fast LPU inference)
    - TTS: Cartesia Sonic (Studio-grade human realism, ~90ms latency)
    """
    transport = FastAPIWebsocketTransport(
        websocket=websocket_client,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            serializer=RawAudioSerializer(),
            audio_in_sample_rate=16000,
            audio_out_sample_rate=16000,
        ),
    )

    # 1. Groq Whisper STT Service
    stt = GroqSTTService(
        api_key=config.GROQ_API_KEY,
        settings=GroqSTTService.Settings(
            model=config.GROQ_STT_MODEL,
        ),
    )

    # 2. Groq LLM Service (Fast LPU inference)
    llm = GroqLLMService(
        api_key=config.GROQ_API_KEY,
        settings=GroqLLMService.Settings(
            model=config.GROQ_MODEL,
        ),
    )

    # 3. Cartesia Sonic TTS Service (Studio-grade human voice)
    tts = CartesiaTTSService(
        api_key=config.CARTESIA_API_KEY,
        sample_rate=16000,
        settings=CartesiaTTSService.Settings(
            voice=config.DEFAULT_VOICE_ID,
            model=config.CARTESIA_MODEL_ID,
        ),
    )

    # 4. Context & System Instruction
    context = LLMContext(
        [
            {
                "role": "system",
                "content": (
                    "You are a friendly, witty, and concise real-time voice assistant. "
                    "Your responses will be spoken aloud to the user using text-to-speech. "
                    "Keep your responses short, conversational, and direct (1 to 2 sentences max). "
                    "Do not use markdown formatting, bullet points, or emojis."
                ),
            }
        ]
    )

    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer()),
    )

    # 5. Build Pipeline
    pipeline = Pipeline(
        [
            transport.input(),              # Mic audio stream from client
            stt,                            # Groq Whisper STT
            user_aggregator,                # User turn aggregator
            llm,                            # Groq LLM
            tts,                            # Cartesia Sonic TTS
            transport.output(),             # Synthesized audio to client
            assistant_aggregator,           # Assistant turn aggregator
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected to Groq + Cartesia voice pipeline.")
        context.add_message(
            {"role": "user", "content": "Please introduce yourself briefly in 1 friendly sentence."}
        )
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected from voice pipeline.")
        await task.queue_frames([EndFrame()])

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)
