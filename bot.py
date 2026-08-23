import json
import sys
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    EndFrame,
    Frame,
    InputAudioRawFrame,
    InterimTranscriptionFrame,
    OutputAudioRawFrame,
    TextFrame,
    TranscriptionFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.service_switcher import ServiceSwitcher, ServiceSwitcherStrategyFailover
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.serializers.base_serializer import FrameSerializer
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.flux.tts import DeepgramFluxTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.elevenlabs.stt import ElevenLabsRealtimeSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.groq.llm import GroqLLMService
from pipecat.services.groq.stt import GroqSTTService
from pipecat.services.tts_service import TextAggregationMode
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

import config

logger.remove()
logger.add(sys.stderr, level="INFO")


class FastAPIRealtimeSerializer(FrameSerializer):
    """Serializes outgoing raw PCM audio bytes and deserializes incoming PCM audio or text."""

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
        if isinstance(data, str) and data.strip():
            return TranscriptionFrame(
                text=data.strip(),
                user_id="user",
                timestamp="",
                finalized=True,
            )
        return None


class TranscriptBroadcaster(FrameProcessor):
    """Transmits live user STT, bot streaming text, and state synchronization directly to the UI."""

    def __init__(self, websocket):
        super().__init__()
        self._ws = websocket

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, InterimTranscriptionFrame):
            if frame.text and frame.text.strip():
                await self._send({"type": "user_transcript", "text": frame.text.strip(), "final": False})
        elif isinstance(frame, TranscriptionFrame):
            if frame.text and frame.text.strip():
                await self._send({"type": "user_transcript", "text": frame.text.strip(), "final": True})
                await self._send({"type": "bot_state", "state": "thinking"})
        elif isinstance(frame, TextFrame):
            if frame.text:
                await self._send({"type": "bot_transcript", "text": frame.text})
        elif isinstance(frame, BotStartedSpeakingFrame):
            await self._send({"type": "bot_state", "state": "speaking"})
        elif isinstance(frame, BotStoppedSpeakingFrame):
            await self._send({"type": "bot_state", "state": "listening"})
        elif isinstance(frame, UserStartedSpeakingFrame):
            await self._send({"type": "bot_state", "state": "listening"})

        await self.push_frame(frame, direction)

    async def _send(self, payload: dict):
        try:
            await self._ws.send_text(json.dumps(payload))
        except Exception:
            pass


async def run_bot(websocket_client):
    transport = FastAPIWebsocketTransport(
        websocket=websocket_client,
        params=FastAPIWebsocketParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            add_wav_header=False,
            serializer=FastAPIRealtimeSerializer(),
            audio_in_sample_rate=16000,
            audio_out_sample_rate=16000,
        ),
    )

    # 1. STT with 3-Tier Failover
    elevenlabs_stt = ElevenLabsRealtimeSTTService(
        api_key=config.ELEVENLABS_API_KEY,
        settings=ElevenLabsRealtimeSTTService.Settings(
            model="scribe_v2_realtime",
        ),
    )

    groq_stt = GroqSTTService(
        api_key=config.GROQ_API_KEY,
        settings=GroqSTTService.Settings(
            model=config.GROQ_STT_MODEL,
        ),
    )

    deepgram_stt = DeepgramSTTService(
        api_key=config.DEEPGRAM_API_KEY,
        settings=DeepgramSTTService.Settings(
            model="nova-3",
            interim_results=True,
        ),
    )

    stt_switcher = ServiceSwitcher(
        services=[elevenlabs_stt, groq_stt, deepgram_stt],
        strategy_type=ServiceSwitcherStrategyFailover,
    )

    # 2. LLM (Groq)
    llm = GroqLLMService(
        api_key=config.GROQ_API_KEY,
        settings=GroqLLMService.Settings(model=config.GROQ_MODEL),
    )

    # 3. TTS with 3-Tier Failover (1st: ElevenLabs, 2nd: Deepgram, 3rd: Cartesia)
    elevenlabs_tts = ElevenLabsTTSService(
        api_key=config.ELEVENLABS_API_KEY,
        sample_rate=16000,
        settings=ElevenLabsTTSService.Settings(
            voice=config.ELEVENLABS_VOICE_ID,
            model=config.ELEVENLABS_MODEL_ID,
        ),
    )

    deepgram_tts = DeepgramFluxTTSService(
        api_key=config.DEEPGRAM_API_KEY,
        sample_rate=16000,
        text_aggregation_mode=TextAggregationMode.TOKEN,
        settings=DeepgramFluxTTSService.Settings(voice=config.DEEPGRAM_VOICE),
    )

    cartesia_tts = CartesiaTTSService(
        api_key=config.CARTESIA_API_KEY,
        sample_rate=16000,
        settings=CartesiaTTSService.Settings(
            voice=config.DEFAULT_VOICE_ID,
            model=config.CARTESIA_MODEL_ID,
        ),
    )

    tts_switcher = ServiceSwitcher(
        services=[elevenlabs_tts, deepgram_tts, cartesia_tts],
        strategy_type=ServiceSwitcherStrategyFailover,
    )

    context = LLMContext(
        [
            {
                "role": "system",
                "content": (
                    "You are a friendly, witty, and concise real-time voice assistant. "
                    "Your responses will be spoken aloud using text-to-speech. "
                    "Keep your responses short, natural, direct, and conversational (1 to 2 sentences max). "
                    "Do not use markdown formatting, emojis, or bullet points."
                ),
            }
        ]
    )

    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    user_transcripts = TranscriptBroadcaster(websocket_client)
    bot_transcripts = TranscriptBroadcaster(websocket_client)

    pipeline = Pipeline(
        [
            transport.input(),
            stt_switcher,
            user_transcripts,
            user_aggregator,
            llm,
            bot_transcripts,
            tts_switcher,
            transport.output(),
            assistant_aggregator,
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
        logger.info("Client connected to Voice Pipeline via FastAPI WebSocket.")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected from voice pipeline.")
        await task.queue_frames([EndFrame()])

    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)
