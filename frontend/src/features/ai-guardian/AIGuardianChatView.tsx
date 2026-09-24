import { useAIGuardianChat } from './useAIGuardianChat'

export default function AIGuardianChatView() {
  const { messages, input, setInput, isTyping, handleSend, chatBottomRef } = useAIGuardianChat()

  const quickChips = [
    '📅 Show today\'s itinerary & bookings',
    '📊 What is my total month spend for September?',
    '☕ Can I afford a €15 café break?',
    '🇮🇳 Mera budget kitna bacha hai?',
  ]

  return (
    <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
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

                <span
                  className={`text-[9px] block mt-1.5 text-right ${
                    isUser ? 'text-teal-200' : 'text-slate-400'
                  }`}
                >
                  {msg.time}
                </span>
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

      {/* Quick Chips */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px]">
        {quickChips.map((chip, i) => (
          <button
            key={i}
            onClick={() => handleSend(chip)}
            className="px-3 py-1 bg-white border border-teal-100 text-slate-700 hover:text-teal-800 hover:border-teal-300 rounded-full font-medium whitespace-nowrap transition"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask anything..."
          className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          className="px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs md:text-sm transition shadow-sm shrink-0 flex items-center gap-1.5"
        >
          <span>Send</span>
          <span>➤</span>
        </button>
      </div>
    </div>
  )
}
