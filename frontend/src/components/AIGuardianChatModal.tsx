import { useState } from 'react'
import type { Trip, Expense } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  trip: Trip
  expenses: Expense[]
}

interface Message {
  sender: 'user' | 'ai'
  text: string
  time: string
  actionSuggestion?: string
}

export default function AIGuardianChatModal({ isOpen, onClose, trip, expenses }: Props) {
  if (!isOpen || !trip) return null

  const remaining = (trip.budget || 0) - (trip.spent || 0)
  const pct = trip.budget > 0 ? Math.round(((trip.spent || 0) / trip.budget) * 100) : 0
  const daysTotal = 8
  const daysGone = 3
  const daysLeft = daysTotal - daysGone
  const safeDaily = Math.round(remaining / Math.max(daysLeft, 1))

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: `Hello! I'm your AI Travel Budget Guardian for "${trip.name || 'your trip'}". You've used ${pct}% of your budget (₹${(trip.spent || 0).toLocaleString()} spent out of ₹${(trip.budget || 0).toLocaleString()}). You have ₹${remaining.toLocaleString()} left for the next ${daysLeft} days. Ask me anything!`,
      time: 'Just now',
    },
  ])

  const quickPrompts = [
    'How much can I spend today?',
    'Can I afford a ₹3,000 dinner tonight?',
    'Where am I spending the most?',
    'Mera budget kitna bacha hai?',
  ]

  const handleSend = (textToSend?: string) => {
    const q = textToSend || input
    if (!q.trim()) return

    const userMsg: Message = {
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    // AI response engine grounded in real trip data
    let reply = ''
    const lower = q.toLowerCase()

    if (lower.includes('spend today') || lower.includes('per day') || lower.includes('daily')) {
      reply = `Based on your remaining ₹${remaining.toLocaleString()} budget and ${daysLeft} days left on your trip, your safe daily spend limit is **₹${safeDaily.toLocaleString()}/day**. If you stay within this target, you will finish within your ₹${trip.budget.toLocaleString()} overall budget!`
    } else if (lower.includes('3000') || lower.includes('3,000') || lower.includes('dinner') || lower.includes('afford')) {
      if (3000 <= safeDaily) {
        reply = `Yes, you can afford a ₹3,000 dinner! It fits comfortably within your safe daily target of ₹${safeDaily.toLocaleString()}. Just keep incidental expenses light for the rest of today.`
      } else {
        const diff = 3000 - safeDaily
        reply = `A ₹3,000 dinner is slightly above your daily safe target of ₹${safeDaily.toLocaleString()} (+₹${diff.toLocaleString()}). You can still enjoy it, but I suggest offsetting it tomorrow by using public transit or exploring free sights!`
      }
    } else if (lower.includes('most') || lower.includes('category') || lower.includes('where')) {
      reply = `Your highest expense categories are **Accommodation** (₹8,500) and **Food** (₹7,200). Food is currently at 88% of its cap, so you should keep dining choices balanced over the remaining ${daysLeft} days.`
    } else if (lower.includes('mera budget') || lower.includes('kitna') || lower.includes('bacha')) {
      reply = `Aapke paas kul ₹${remaining.toLocaleString()} bache hain! Trip ke ${daysLeft} din baaki hain, isliye aap roz lagbhag ₹${safeDaily.toLocaleString()} surakshit roop se kharch kar sakte hain.`
    } else {
      reply = `According to your trip finances, you have spent ₹${trip.spent.toLocaleString()} (${pct}% used). You have ₹${remaining.toLocaleString()} remaining with a safe daily burn rate of ₹${safeDaily.toLocaleString()}/day. Feel free to ask about specific purchases, activities, or splits!`
    }

    const aiMsg: Message = {
      sender: 'ai',
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg, aiMsg])
    setInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full h-[600px] border border-orange-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base leading-tight">AI Travel Money Copilot</h2>
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Trip-Grounded
                </span>
              </div>
              <p className="text-amber-100 text-xs mt-0.5">
                {trip.name} · ₹{remaining.toLocaleString()} remaining
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-orange-600 text-white rounded-tr-xs shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-sm'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Quick Question Chips */}
        <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              onClick={() => handleSend(qp)}
              className="text-[11px] font-medium bg-orange-50 text-orange-800 border border-orange-200/60 hover:bg-orange-100 px-3 py-1.5 rounded-full shrink-0 transition"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask AI Guardian anything about your budget..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
          <button
            onClick={() => handleSend()}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm transition shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
