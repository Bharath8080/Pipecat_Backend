import React, { useState } from 'react';
import { useVoiceAgent } from './hooks/useVoiceAgent';
import { AgentAudioVisualizerAura } from './components/agents-ui/agent-audio-visualizer-aura';
import { AgentAudioVisualizerBar } from './components/agents-ui/agent-audio-visualizer-bar';
import { AgentControlBar } from './components/agents-ui/agent-control-bar';
import { AgentChatTranscript } from './components/agents-ui/agent-chat-transcript';
import { DocumentUploadModal } from './components/agents-ui/document-upload-modal';
import { FileText } from 'lucide-react';

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

  const [visualizer, setVisualizer] = useState('livekit-aura');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [docCount, setDocCount] = useState(0);

  return (
    <div className="w-full h-[100dvh] bg-[#07080a] text-neutral-100 flex flex-col justify-between font-sans select-none overflow-hidden">
      {/* 1. LiveKit Header */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#0a0c0f]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-white font-mono font-bold text-xs">
            LK
          </div>
          <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-neutral-200 uppercase">
            LiveKit Voice RAG
          </span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Document Knowledge Base Button */}
          <button
            onClick={() => setIsDocsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-neutral-300 text-xs font-mono transition-all cursor-pointer"
            title="Manage RAG Knowledge Base Documents"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">Documents</span>
            {docCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
                {docCount}
              </span>
            )}
          </button>

          {/* Visualizer Switcher */}
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/5 border border-white/10 text-xs">
            {[
              { id: 'livekit-aura', label: '🌟 Aura' },
              { id: 'livekit-bar', label: '📊 Bar' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setVisualizer(item.id)}
                className={`px-3 py-1 rounded-full text-[11px] transition-all cursor-pointer ${
                  visualizer === item.id
                    ? 'bg-white/20 text-white font-medium shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Error Notification */}
      {errorMessage && (
        <div className="w-fit mx-auto mt-2 px-4 py-1 rounded-lg bg-rose-950/90 border border-rose-800 text-rose-300 text-xs shadow-lg z-20 shrink-0">
          {errorMessage}
        </div>
      )}

      {/* 2. Main Stage with LiveKit Tile System */}
      <main className="flex-1 flex flex-col md:flex-row items-stretch justify-center p-3 sm:p-5 gap-4 min-h-0 relative overflow-hidden">
        {/* Assistant Tile */}
        <div className="flex-1 flex flex-col justify-between items-center rounded-2xl bg-[#0c0e12]/80 border border-white/10 p-4 sm:p-6 min-h-0 relative overflow-hidden">
          {/* Tile Header Label */}
          <div className="w-full flex items-center justify-between shrink-0 font-mono text-[10px] sm:text-[11px] tracking-widest text-neutral-500 uppercase">
            <span>ASSISTANT</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  orbState === 'speaking'
                    ? 'bg-cyan-400 animate-ping'
                    : orbState === 'listening'
                    ? 'bg-emerald-400'
                    : orbState === 'thinking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-neutral-600'
                }`}
              />
              <span className="text-neutral-400">{orbState.toUpperCase()}</span>
            </span>
          </div>

          {/* Visualizer Hero Area */}
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-0 my-auto">
            {visualizer === 'livekit-aura' ? (
              <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
                <AgentAudioVisualizerAura
                  state={orbState}
                  volume={volume}
                  size="xl"
                  theme="aura"
                />
              </div>
            ) : (
              <div className="w-48 sm:w-64 h-24 flex items-center justify-center">
                <AgentAudioVisualizerBar
                  state={orbState}
                  volume={volume}
                  barCount={24}
                  size="lg"
                  theme="aura"
                />
              </div>
            )}

            {/* Subtitle status */}
            <p className="mt-4 text-xs font-mono text-neutral-400 tracking-wide text-center">
              {STATUS_TEXT[orbState] || STATUS_TEXT.idle}
            </p>
          </div>

          {/* Bottom LiveKit Control Dock */}
          <div className="w-full flex items-center justify-center shrink-0 pt-2">
            <AgentControlBar
              variant="livekit"
              state={orbState}
              isMuted={isMuted}
              volume={volume}
              isChatOpen={isChatOpen}
              onIsChatOpenChange={setIsChatOpen}
              onStart={startCall}
              onStop={stopCall}
              onToggleMute={toggleMute}
            />
          </div>
        </div>

        {/* Conversation Drawer / Tile */}
        {isChatOpen && (
          <div className="w-full md:w-[380px] lg:w-[420px] h-[340px] md:h-full shrink-0 animate-in fade-in zoom-in-95 duration-200">
            <AgentChatTranscript
              messages={messages}
              onSendMessage={sendMessage}
              onClear={clearMessages}
              onClose={() => setIsChatOpen(false)}
              className="w-full h-full"
            />
          </div>
        )}
      </main>

      {/* RAG Knowledge Base Document Upload Modal */}
      <DocumentUploadModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        onDocumentsChange={(docs) => setDocCount(docs.length)}
      />
    </div>
  );
}

export default App;
