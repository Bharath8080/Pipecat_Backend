import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { MessageSquare, Trash2, X, Sparkles, Send } from 'lucide-react';

export function AgentChatTranscript({
  messages = [],
  onSendMessage,
  onClear,
  onClose,
  className,
}) {
  const scrollRef = useRef(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (text.trim() && onSendMessage) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col bg-[#0d0f12]/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl select-none',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-neutral-300" />
          <span>CONVERSATION</span>
          {messages.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-mono text-[10px]">
              {messages.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && onClear && (
            <button onClick={onClear} className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-rose-400 transition-colors" title="Clear">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors" title="Close">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 py-3 pr-1 min-h-0 text-xs sm:text-sm">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-600 text-xs py-8">
            <Sparkles className="w-5 h-5 text-neutral-700 mb-2 opacity-50" />
            <p className="text-neutral-400 font-medium font-mono text-xs">NO MESSAGES YET</p>
            <p className="text-[11px] text-neutral-600 mt-1">Speak or type a message below.</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <div key={i} className={cn('flex flex-col max-w-full', isUser ? 'items-end' : 'items-start')}>
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-1 px-1">
                  {isUser ? 'YOU' : 'AGENT'}
                </span>
                <div
                  className={cn(
                    'max-w-[90%] w-fit px-3.5 py-2.5 rounded-xl leading-relaxed text-xs sm:text-sm transition-all break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-hidden',
                    isUser
                      ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                      : 'bg-[#15181e] text-neutral-300 border border-white/5'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">{m.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* LiveKit Sleek Text Input */}
      <form onSubmit={handleSubmit} className="pt-2.5 border-t border-white/10 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message to the agent..."
          className="flex-1 bg-white/5 border border-white/10 focus:border-white/30 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2 rounded-xl bg-neutral-200 hover:bg-white text-neutral-900 disabled:opacity-30 disabled:hover:bg-neutral-200 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
