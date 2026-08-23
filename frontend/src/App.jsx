import React, { useState, useEffect } from 'react';
import { useVoiceAgent } from './hooks/useVoiceAgent';
import { AgentAudioVisualizerAura } from './components/agents-ui/agent-audio-visualizer-aura';
import { AgentAudioVisualizerBar } from './components/agents-ui/agent-audio-visualizer-bar';
import { AgentControlBar } from './components/agents-ui/agent-control-bar';
import { AgentChatTranscript } from './components/agents-ui/agent-chat-transcript';

const STATUS_TEXT = {
  idle: 'Press Start Call to begin conversation',
  connecting: 'Connecting to agent...',
  listening: 'Agent is listening, ask it a question',
  thinking: 'Agent is processing...',
  speaking: 'Agent is speaking...',
  error: 'Connection error. Please try again.',
};

export function App() {
  const {
    orbState,
    volume,
    isMuted,
    messages,
    errorMessage,
    startCall,
    stopCall,
    toggleMute,
    sendMessage,
    clearMessages,
  } = useVoiceAgent();

  // Visualizer choices: 'livekit-aura' | 'livekit-bar'
  const [visualizer, setVisualizer] = useState('livekit-aura');
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-[100dvh] bg-[#08090a] text-neutral-100 flex flex-col justify-between p-3 sm:p-5 md:p-6 select-none font-sans overflow-hidden">
      {/* 1. Header: LiveKit Mark + Visualizer Switcher */}
      <header className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer opacity-95 hover:opacity-100 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-neutral-800/90 border border-neutral-700/80 flex items-center justify-center text-neutral-200 font-bold text-xs shadow-sm">
              LK
            </div>
            <span className="text-sm font-semibold tracking-wide text-neutral-200">
              LiveKit Agents Studio
            </span>
          </div>
        </div>

        {/* Visualizer Type Selector */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#121418] border border-[#20232a] text-xs">
          {[
            { id: 'livekit-aura', label: '🌟 LiveKit Aura' },
            { id: 'livekit-bar', label: '📊 LiveKit Bar' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setVisualizer(item.id)}
              className={`px-3 py-1 rounded-full text-[11px] sm:text-xs transition-all duration-150 ${
                visualizer === item.id
                  ? 'bg-neutral-700 text-white font-medium shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="w-fit mx-auto my-1 px-4 py-1.5 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-300 text-xs shadow-lg z-20 shrink-0">
          {errorMessage}
        </div>
      )}

      {/* 2. Main Stage (Split-screen: Left Visualizer Stage + Smooth Right-side Transcript Drawer) */}
      <main className="w-full max-w-7xl mx-auto flex-1 flex flex-col md:flex-row items-center justify-center gap-4 lg:gap-8 py-2 min-h-0 relative overflow-hidden">
        {/* Left Side: Visualizer Stage */}
        <div
          className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 ease-in-out w-full h-full min-h-0 ${
            isTranscriptOpen ? 'md:pr-2' : 'max-w-3xl'
          }`}
        >
          <div className="relative flex items-center justify-center w-full flex-1 min-h-0">
            {visualizer === 'livekit-aura' ? (
              <div
                className={`relative flex items-center justify-center transition-all duration-300 ${
                  isTranscriptOpen
                    ? 'w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80'
                    : 'w-72 h-72 sm:w-88 sm:h-88 md:w-[380px] md:h-[380px]'
                }`}
              >
                <AgentAudioVisualizerAura
                  size={isTranscriptOpen ? 'lg' : 'xl'}
                  color="#E2E8F0"
                  colorShift={0.1}
                  state={orbState === 'idle' ? 'listening' : orbState}
                  volume={volume}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div
                className={`w-full flex items-center justify-center transition-all duration-300 ${
                  isTranscriptOpen ? 'max-w-xs' : 'max-w-md'
                }`}
              >
                <AgentAudioVisualizerBar
                  size={isTranscriptOpen || isMobile ? 'lg' : 'xl'}
                  color="#E2E8F0"
                  state={orbState === 'idle' ? 'listening' : orbState}
                  volume={volume}
                  className="mx-auto"
                />
              </div>
            )}
          </div>

          {/* Centered Status Subtitle */}
          <div className="py-2 shrink-0">
            <p className="text-xs sm:text-sm font-normal tracking-wide text-neutral-400 text-center animate-pulse transition-all">
              {STATUS_TEXT[orbState] || STATUS_TEXT.idle}
            </p>
          </div>
        </div>

        {/* Right Side: Non-overlapping Right-docked Transcript Sidebar */}
        <div
          className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden flex flex-col ${
            isTranscriptOpen
              ? 'w-full md:w-[380px] lg:w-[420px] h-[340px] md:h-full max-h-[520px] opacity-100 translate-x-0'
              : 'w-0 h-0 opacity-0 translate-x-8 pointer-events-none'
          }`}
        >
          {isTranscriptOpen && (
            <AgentChatTranscript
              messages={messages}
              onSendMessage={sendMessage}
              onClear={clearMessages}
              onClose={() => setIsTranscriptOpen(false)}
              className="w-full h-full"
            />
          )}
        </div>
      </main>

      {/* 3. Bottom LiveKit Floating AgentControlBar Dock */}
      <footer className="w-full max-w-7xl mx-auto flex items-center justify-center z-10 pt-2 pb-1 shrink-0">
        <AgentControlBar
          variant="livekit"
          state={orbState}
          isMuted={isMuted}
          volume={volume}
          isChatOpen={isTranscriptOpen}
          onIsChatOpenChange={setIsTranscriptOpen}
          onStart={startCall}
          onStop={stopCall}
          onToggleMute={toggleMute}
        />
      </footer>
    </div>
  );
}

export default App;
