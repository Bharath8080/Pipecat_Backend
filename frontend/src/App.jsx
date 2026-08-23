import React, { useState, useEffect, useRef } from 'react';
import { Orb } from 'orb-ui';
import { useVoiceAgent } from './hooks/useVoiceAgent';
import { Mic, MicOff, PhoneCall, PhoneOff, Trash2, MessageSquare, ChevronUp, ChevronDown } from 'lucide-react';

const STATUS_TEXT = {
  idle: 'Press Start Call to begin conversation',
  connecting: 'Connecting to voice agent...',
  listening: 'Agent is listening, ask a question',
  thinking: 'Agent is processing...',
  speaking: 'Agent is speaking...',
  error: 'Connection error. Please try again.',
};

export function App() {
  const {
    orbState,
    volume,
    inputVolume,
    outputVolume,
    isMuted,
    messages,
    errorMessage,
    startCall,
    stopCall,
    toggleMute,
    clearMessages,
  } = useVoiceAgent();

  const [theme, setTheme] = useState('bars'); // 'bars' | 'radial' | 'cloud'
  const [isMobileTranscriptOpen, setIsMobileTranscriptOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const isConnected = orbState !== 'idle' && orbState !== 'error';
  const scrollRef = useRef(null);

  // Responsive screen listener for optimal Orb size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Responsive Orb Size: 220px on mobile, 300px on desktop
  const orbSize = isMobile ? 220 : 300;

  return (
    <div className="w-full h-[100dvh] bg-[#08090a] text-neutral-100 flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none font-sans overflow-hidden">
      {/* 1. Header: Minimalist branding + Theme Selector */}
      <header className="w-full flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs tracking-tighter">
            AI
          </div>
          <span className="text-sm font-semibold tracking-wide text-neutral-300">
            Voice Agent
          </span>
        </div>

        {/* Theme Selector (orb-ui official themes) */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#121418] border border-[#20232a] text-xs">
          {['bars', 'radial', 'cloud'].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-2.5 sm:px-3 py-1 rounded-full capitalize text-[11px] sm:text-xs transition-all duration-150 ${
                theme === t
                  ? 'bg-neutral-800 text-white font-medium shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t}
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

      {/* 2. Main Canvas (Responsive: Stacked on Mobile, 2-Column on Desktop) */}
      <main className="w-full max-w-6xl mx-auto flex-1 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 py-2 md:py-4 z-10 min-h-0">
        {/* Visualizer Column / Center */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 sm:gap-4 shrink-0">
          <div className="relative flex items-center justify-center p-2 sm:p-4">
            <Orb
              state={orbState}
              volume={volume}
              inputVolume={inputVolume}
              outputVolume={outputVolume}
              theme={theme}
              size={orbSize}
              interactive={false}
              style={{
                '--orb-ui-radial-control-surround': '#08090a',
              }}
              aria-label={`Voice assistant is ${orbState}`}
            />
          </div>

          <p className="text-xs sm:text-sm text-neutral-400 font-normal tracking-wide text-center max-w-xs sm:max-w-md">
            {STATUS_TEXT[orbState] || STATUS_TEXT.idle}
          </p>
        </div>

        {/* Transcript Panel (Responsive: Compact collapsible on Mobile, Full-Height on Desktop) */}
        <div
          className={`w-full md:w-[420px] flex flex-col bg-[#111317]/90 border border-[#20232a] rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md overflow-hidden transition-all duration-300 ${
            isMobile
              ? isMobileTranscriptOpen
                ? 'h-[170px] shrink-0'
                : 'h-10 shrink-0'
              : 'h-[480px] shrink-0'
          }`}
        >
          {/* Transcript Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#1c1f26] mb-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
              <span>Transcript</span>
              {messages.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1c1f26] text-neutral-400">
                  {messages.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="text-neutral-500 hover:text-rose-400 transition-colors p-1"
                  title="Clear transcript"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Mobile collapse/expand toggle button */}
              {isMobile && (
                <button
                  onClick={() => setIsMobileTranscriptOpen(!isMobileTranscriptOpen)}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                  title={isMobileTranscriptOpen ? 'Collapse transcript' : 'Expand transcript'}
                >
                  {isMobileTranscriptOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Transcript Message Feed */}
          {(!isMobile || isMobileTranscriptOpen) && (
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-2.5 pr-1 scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 text-xs py-4">
                  <p>Start call and speak to see live text</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] uppercase font-semibold text-neutral-500 mb-0.5 px-1">
                        {isUser ? 'You' : 'Assistant'}
                      </span>
                      <div
                        className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                          isUser
                            ? msg.final
                              ? 'bg-[#22262e] text-[#f0f2f5] border border-[#323742] rounded-tr-none'
                              : 'bg-[#1b1e24] text-neutral-400 border border-[#282d37] italic rounded-tr-none'
                            : 'bg-[#14161b] text-[#d1d5dc] border border-[#20232a] rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>

      {/* 3. Floating Bottom Controls (Optimized for Mobile Thumb-Reach) */}
      <footer className="w-full flex items-center justify-center z-10 pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-[#131518] border border-[#22252c] shadow-2xl">
          {/* Mic Mute Toggle */}
          {isConnected && (
            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-full border transition-all ${
                isMuted
                  ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                  : 'bg-[#1e2229] hover:bg-[#282d36] text-neutral-200 border-[#2d323c]'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-white" />}
            </button>
          )}

          {/* Start / End Call Button */}
          {!isConnected ? (
            <button
              onClick={startCall}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/70 text-emerald-300 font-semibold text-xs tracking-wider uppercase shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5 fill-current" />
              <span>Start Call</span>
            </button>
          ) : (
            <button
              onClick={stopCall}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs tracking-wider uppercase shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
