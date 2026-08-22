const { useRef, useEffect, useState } = React;

const getWebSocketURL = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
};

const App = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [text, setText] = useState("Tap 'Start Conversation' to talk with AI...");

  const socketRef = useRef(null);
  const audioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const processorRef = useRef(null);
  const scheduledTimeRef = useRef(0);

  // Initialize Web Audio Context
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx({ sampleRate: 16000 });
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Play incoming raw 16-bit PCM audio from Pipecat / Cartesia
  const playAudioChunk = (arrayBuffer) => {
    const ctx = getAudioContext();
    const int16Array = new Int16Array(arrayBuffer);
    if (int16Array.length === 0) return;

    // Convert Int16 PCM to Float32 for Web Audio API
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32Array.length, 16000);
    audioBuffer.copyToChannel(float32Array, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    const startTime = Math.max(scheduledTimeRef.current || 0, currentTime);
    source.start(startTime);
    scheduledTimeRef.current = startTime + audioBuffer.duration;
  };

  // Start Mic & WebSocket
  const startConversation = async () => {
    const ctx = getAudioContext();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      const socket = new WebSocket(getWebSocketURL());
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("Connected");
        setIsActive(true);
        setText("AI Voice Session Active. Start speaking naturally!");

        // Setup microphone audio capture (16kHz PCM streaming)
        const micSource = ctx.createMediaStreamSource(stream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);

          // Convert Float32 to Int16 PCM
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          socket.send(pcm16.buffer);
        };

        micSource.connect(processor);
        processor.connect(ctx.destination);
      };

      socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          playAudioChunk(event.data);
        } else if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);
            if (data.text) {
              setText((prev) => prev + "\n" + data.text);
            }
          } catch (e) {
            setText((prev) => prev + "\n" + event.data);
          }
        }
      };

      socket.onclose = () => {
        stopConversation();
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please grant permission in your browser.");
    }
  };

  // Stop Mic & WebSocket
  const stopConversation = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsActive(false);
    setStatus("Disconnected");
    setText("Session ended. Tap 'Start Conversation' to talk again.");
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-xl p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-gray-700 pb-3">
          <div>
            <h1 className="font-semibold text-lg">Pipecat Voice AI Agent</h1>
            <p className="text-xs text-gray-400">Powered by Cartesia Sonic & Mistral AI</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isActive ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            ></span>
            <span className="text-xs text-gray-400">{status}</span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-md p-4 min-h-[180px] max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono text-sm text-gray-300">
          {text}
        </div>

        <button
          onClick={isActive ? stopConversation : startConversation}
          className={`w-full py-3.5 rounded-md font-semibold text-sm transition-all ${
            isActive
              ? "bg-red-600 hover:bg-red-700 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isActive ? "🛑 End Conversation" : "🎤 Start Conversation"}
        </button>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("react")).render(<App />);
