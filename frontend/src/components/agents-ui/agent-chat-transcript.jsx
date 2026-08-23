import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { MessageSquare, Trash2, X, Sparkles, User, Bot, ArrowUp } from 'lucide-react';

export function AgentChatTranscript({
  messages = [],
  onSendMessage,
  onClear,
  onClose,
  className,
}) {
  const scrollRef = useRef(null);
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (inputVal.trim() && onSendMessage) {
      onSendMessage(inputVal.trim());
      setInputVal('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col bg-[#111317]/95 border border-[#20232a] rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl overflow-hidden select-none',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c1f26] mb-3 shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-300">
          <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
          <span>Transcript</span>
          {messages.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c1f26] text-neutral-400 font-mono">
              {messages.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && onClear && (
            <button
              onClick={onClear}
              className="p-1 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-[#1c1f26] transition-colors"
              title="Clear transcript"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-[#1c1f26] transition-colors"
              title="Close transcript"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 scroll-smooth min-h-0"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 text-xs py-8">
            <Sparkles className="w-6 h-6 text-neutral-700 mb-2 opacity-60" />
            <p className="text-neutral-400 font-medium">No conversation recorded</p>
            <p className="text-[11px] text-neutral-600 mt-0.5">
              Speak or type a message below to start talking with the agent.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
              >
                {/* Speaker Label */}
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                  {isUser ? (
                    <>
                      <span>You</span>
                      <User className="w-3 h-3 text-neutral-400" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-neutral-300" />
                      <span>LiveKit Agent</span>
                    </>
                  )}
                </div>

                {/* Message Bubble (Sleek Dark Gray Monochrome) */}
                <div
                  className={cn(
                    'max-w-[88%] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm leading-relaxed transition-all duration-150',
                    isUser
                      ? msg.final
                        ? 'bg-[#22262e] text-[#f0f2f5] border border-[#323742] rounded-tr-none'
                        : 'bg-[#1b1e24] text-neutral-400 border border-[#282d37] italic rounded-tr-none'
                      : 'bg-[#14161b] text-[#d1d5dc] border border-[#20232a] rounded-tl-none'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Text Message Input Bar */}
      <form
        onSubmit={handleSend}
        className="mt-3 pt-2.5 border-t border-[#1c1f26] flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message to agent..."
          className="flex-1 bg-[#16181e] border border-[#262a34] focus:border-neutral-500 rounded-xl px-3 py-2 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputVal.trim()}
          className="p-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 disabled:hover:bg-neutral-700 text-white transition-all shadow-sm"
          title="Send message"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
