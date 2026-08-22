import sys
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import EndFrame, Frame, InputAudioRawFrame, LLMContextFrame, OutputAudioRawFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.serializers.base_serializer import FrameSerializer
from pipecat.services.cartesia.stt import CartesiaSTTService
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.mistral.llm import MistralLLMService
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
    Runs the Pipecat real-time conversational voice pipeline for a connected WebSocket client.
    """
    # 1. Setup FastAPI WebSocket transport with RawAudioSerializer and Silero VAD
    transport = FastAPIWebsocketTransport(
        websocket=websocket_client,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            vad_enabled=True,
            vad_analyzer=SileroVADAnalyzer(),
            vad_audio_passthrough=True,
            serializer=RawAudioSerializer(),
            audio_in_sample_rate=16000,
            audio_out_sample_rate=16000,
        ),
    )

    # 2. Cartesia Live STT Service (16kHz)
    stt = CartesiaSTTService(
        api_key=config.CARTESIA_API_KEY,
    )

    # 3. Mistral LLM Service
    llm = MistralLLMService(
        api_key=config.MISTRAL_API_KEY,
        settings=MistralLLMService.Settings(
            model=config.MISTRAL_MODEL,
        ),
    )

    # 4. Cartesia Sonic TTS Service (16kHz PCM output)
    tts = CartesiaTTSService(
        api_key=config.CARTESIA_API_KEY,
        sample_rate=16000,
        settings=CartesiaTTSService.Settings(
            voice=config.DEFAULT_VOICE_ID,
            model=config.CARTESIA_MODEL_ID,
        ),
    )

    # 5. Context & System Prompt
    messages = [
        {
            "role": "system",
            "content": (
                "You are a friendly, witty, and concise real-time voice assistant. "
                "Keep your responses short, conversational, and direct (1 to 2 sentences max). "
                "Do not use markdown formatting, bullet points, or emojis."
            ),
        }
    ]
    context = LLMContext(messages)
    context_aggregator = LLMContextAggregatorPair(context)

    # 6. Build Pipecat Pipeline
    pipeline = Pipeline(
        [
            transport.input(),              # Raw mic PCM from client WebSocket
            stt,                            # Cartesia Speech-To-Text
            context_aggregator.user(),      # User context aggregator
            llm,                            # Mistral LLM
            tts,                            # Cartesia Sonic TTS
            transport.output(),             # Synthesized audio to client WebSocket
            context_aggregator.assistant(), # Assistant context aggregator
        ]
    )

    task = PipelineTask(pipeline, params=PipelineParams(allow_interruptions=True))

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info("Client connected to Pipecat voice pipeline.")
        # Trigger initial greeting
        await task.queue_frames([LLMContextFrame(context)])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected from Pipecat.")
        await task.queue_frames([EndFrame()])

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)
