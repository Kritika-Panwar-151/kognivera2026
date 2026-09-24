import { useAIGuardianChat } from './useAIGuardianChat'
import { getActiveSessionId } from '../../services/llmSessionTracker'

export default function AIGuardianChatView() {
  const { messages, input, setInput, isTyping, handleSend, chatBottomRef } = useAIGuardianChat()
  const activeSessionId = getActiveSessionId()

  const quickChips = [
    '📅 Show today\'s itinerary & bookings',
    '📊 What is my total month spend for September?',
    '☕ Can I afford a €15 café break?',
    '🇮🇳 Mera budget kitna bacha hai?',
  ]

  return (
    <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
      {/* Automated LLM Guard & Session Observability Header */}
      <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 font-medium text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>LLM Access & Identity Guard Active</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
          <span>Session: {activeSessionId.slice(0, 16)}...</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user'
          return (
            <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-sm shrink-0 shadow-xs">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs md:text-sm shadow-2xs ${
                  isUser
                    ? 'bg-teal-600 text-white rounded-tr-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
                }`}
              >
                {/* Formatted body */}
                <div className="space-y-1">
                  {msg.text.split('\n').map((line, lineIndex) => {
                    const parts = line.split(/(\*\*.*?\*\*)/g)
                    return (
                      <p key={lineIndex} className="leading-relaxed">
                        {parts.map((part, partIndex) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return (
                              <strong key={partIndex} className="font-bold">
                                {part.slice(2, -2)}
                              </strong>
                            )
                          }
                          return part
                        })}
                      </p>
                    )
                  })}
                </div>

                {/* Itinerary Cards */}
                {msg.itineraryCards && (
                  <div className="space-y-2 pt-2.5">
                    {msg.itineraryCards.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-teal-100 rounded-xl p-2.5 text-xs text-slate-800 space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-teal-900">{item.title}</span>
                          <span className="text-[10px] font-semibold bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded">
                            {item.cost}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">⏰ {item.time} · 📍 {item.location}</p>
                        <p className="text-[10px] text-slate-400 italic">💡 {item.notes}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer with Trace ID & Timestamp */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200/40 text-[9px]">
                  {msg.traceId ? (
                    <span className="font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span>🛡️ Trace: {msg.traceId.slice(0, 14)}...</span>
                      <span className="text-emerald-500 font-sans">✓ Verified</span>
                    </span>
                  ) : <span />}
                  <span
                    className={`text-[9px] block ${
                      isUser ? 'text-teal-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.time}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {isTyping && (
          <div className="flex gap-2.5 items-center">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center text-sm shadow-xs">
              🤖
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-600 animate-bounce" />
              <span className="inline-block w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]" />
              <span className="inline-block w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]" />
              <span>AI Guardian analyzing trip data...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="shrink-0 text-xs bg-white border border-teal-200/60 hover:border-teal-500 text-teal-800 hover:text-teal-900 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-2xs font-medium"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Bottom Input Area */}
      <div className="p-3 md:p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask anything..."
          className="flex-1 text-xs md:text-sm border border-slate-200 rounded-2xl px-4 py-2.5 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-all bg-slate-50/50"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          className="w-10 h-10 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition-all"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
