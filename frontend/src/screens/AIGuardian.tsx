import { useState, useRef, useEffect } from 'react'
import type { NavigateFn } from '../types'
import { queryGuardianCopilotWithLLM } from '../services/geminiService'

interface Props {
  navigate: NavigateFn
}

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  tags?: { label: string; color: string }[]
  itineraryCards?: { time: string; title: string; type: string; cost: string; note: string; mapsUrl?: string }[]
  metrics?: { label: string; value: string; sub?: string }[]
}

const suggestedPrompts = [
  '🗓️ What is my itinerary plan for today?',
  '🇮🇳 5000 kharche me jodo (Dinner)',
  '💰 Add 5000 to expense',
  '🍕 Can I afford a ₹3,000 dinner tonight in Rome?',
  '🇮🇳 Mera total budget aur kharcha batao',
  '🇮🇹 Aggiungi 45€ per trattoria cena',
  '✈️ When is my return flight and departure?',
]

// Grounded trip & itinerary data
const ITINERARY_DATA = [
  {
    day: 'Day 4 (Today · 15 Sep)',
    items: [
      { time: '10:00 AM – 01:00 PM', title: 'Colosseum & Roman Forum Guided Tour', type: '🎟️ Activity', cost: '€35 (₹3,290)', note: 'Confirmed booking. Skip-the-line vouchers on phone.' },
      { time: '01:30 PM – 02:30 PM', title: 'Lunch at Trattoria Milano', type: '🍽️ Food', cost: '€42 (₹3,948)', note: 'Paid by You · Shared equally among 3 members.' },
      { time: '04:00 PM – 06:00 PM', title: 'Piazza Navona & Pantheon Walk', type: '🏛️ POI', cost: 'Free', note: 'Carbon: 0.2 kg · 1.5 km walking tour.' },
      { time: '08:00 PM – 10:00 PM', title: 'Dinner near Campo de\' Fiori', type: '🍽️ Food', cost: 'Estimated ₹2,500', note: 'Within safe daily limit (₹6,765/day).' },
    ],
  },
  {
    day: 'Day 5 (Tomorrow · 16 Sep)',
    items: [
      { time: '09:00 AM – 12:30 PM', title: 'Vatican Museums & Sistine Chapel', type: '🎟️ Activity', cost: '€30 (₹2,820)', note: 'Pre-booked timed entry slot at 09:30 AM.' },
      { time: '01:30 PM – 04:00 PM', title: 'St. Peter\'s Basilica & Dome Climb', type: '🏛️ POI', cost: '€10 (₹940)', note: 'Elevator + 320 steps to cupola panorama.' },
      { time: '07:30 PM – 09:30 PM', title: 'Trastevere Food Tasting Walk', type: '🍽️ Food', cost: 'Estimated ₹3,200', note: 'Local pasta and gelato exploration.' },
    ],
  },
  {
    day: 'Day 8 (Departure · 20 Sep)',
    items: [
      { time: '11:00 AM – 12:00 PM', title: 'Check-out from Hotel Roma', type: '🏨 Hotel', cost: 'Settled', note: 'Baggage storage available until departure.' },
      { time: '03:30 PM – 04:30 PM', title: 'Leonardo Express to FCO Airport', type: '🚆 Transport', cost: '€14 (₹1,316)', note: 'Direct 32 min train from Termini station.' },
      { time: '07:45 PM', title: 'Flight Depart to New Delhi (DEL)', type: '✈️ Flight', cost: 'Pre-paid', note: 'Terminal 3 · Arrives next morning at 08:30 AM.' },
    ],
  },
]

export default function AIGuardian({ navigate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'assistant',
      text: "👋 Hi Aisha! I'm your **AI Travel Guardian & Copilot**. I have full real-time access to your complete itinerary, all trip budgets, category spending caps, and your total monthly finances across all trips.\n\nAsk me anything! From *\"What is my plan today?\"* to *\"How much have I spent this month?\"* or *\"Can I afford this?\"*.",
      timestamp: 'Just now',
      tags: [
        { label: 'Active Grounding', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { label: 'Europe + Goa + Personal', color: 'bg-teal-50 text-teal-700 border-teal-200' },
      ],
    },
  ])

  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Intelligent Response Generator grounded in PS-08 data
  const generateAIResponse = (query: string): ChatMessage => {
    const q = query.toLowerCase()

    // 1. ITINERARY & SCHEDULE QUERIES
    if (q.includes('itinerary') || q.includes('plan') || q.includes('schedule') || q.includes('today') || q.includes('tomorrow') || q.includes('activity')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'assistant',
        text: "Here is your **live itinerary schedule** for today and upcoming days in Rome:",
        timestamp: 'Just now',
        tags: [{ label: 'Itinerary Schedule', color: 'bg-teal-50 text-teal-800 border-teal-200' }],
        itineraryCards: [
          ...ITINERARY_DATA[0].items,
          ...ITINERARY_DATA[1].items.slice(0, 2),
        ],
      }
    }

    // 2. TOTAL MONTH SPENDING & CROSS-TRIP QUERIES
    if (q.includes('month') || q.includes('total spend') || q.includes('all trip') || q.includes('september') || q.includes('overall')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'assistant',
        text: "Here is your **consolidated spending across all trips & personal ledgers for September 2026**:\n\n• **Europe Adventure (Active Group Trip):** ₹26,172 spent (Budget: ₹60,000 · 44% used)\n• **Goa Getaway (Upcoming Trip Bookings):** ₹8,420 spent (Budget: ₹25,000 · 34% used)\n• **Personal & Flexible Expenses:** ₹3,200 logged\n\n**Total Monthly Spending:** **₹37,792 INR** out of your ₹85,000 combined monthly travel allocation. You are pacing healthily overall!",
        timestamp: 'Just now',
        metrics: [
          { label: 'Total Month Spend', value: '₹37,792', sub: 'across 2 trips + personal' },
          { label: 'Europe Trip Spend', value: '₹26,172', sub: '₹33,828 remaining' },
          { label: 'Goa Trip Spend', value: '₹8,420', sub: '₹16,580 remaining' },
          { label: 'Personal Spend', value: '₹3,200', sub: 'non-trip ledger' },
        ],
      }
    }

    // 3. AFFORDABILITY & "CAN I AFFORD..."
    if (q.includes('afford') || q.includes('dinner') || q.includes('buy') || q.includes('3000') || q.includes('can i')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'assistant',
        text: "✅ **Yes, you can comfortably afford a ₹3,000 dinner tonight!**\n\n**Guardian Financial Math:**\n• **Safe Daily Spend Limit:** **₹6,765 / day**\n• **Today's Spend So Far:** ₹3,948 (Lunch + Colosseum)\n• **Post-Dinner Projection:** Today's total would be ₹6,948—only ₹183 above your average daily target, but well within your **₹33,828 total remaining reserve**.\n\n**Category Check:** Food cap is ₹15,000 with ₹7,800 remaining. Enjoy your dinner!",
        timestamp: 'Just now',
        tags: [
          { label: 'Affordability: Approved', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
          { label: 'Safe Daily: ₹6,765', color: 'bg-teal-50 text-teal-800 border-teal-200' },
        ],
      }
    }

    // 4. BUDGET & CATEGORY CAPS
    if (q.includes('budget') || q.includes('cap') || q.includes('hotel') || q.includes('food') || q.includes('category')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'assistant',
        text: "Here is your **Category Budget Breakdown** for *Europe Adventure*:\n\n🏨 **Accommodation:** ₹8,500 spent of ₹21,000 cap (**₹12,500 remaining**)\n🍽️ **Food & Dining:** ₹7,200 spent of ₹15,000 cap (**₹7,800 remaining**)\n🚗 **Transport:** ₹5,100 spent of ₹12,000 cap (**₹6,900 remaining**)\n⭐ **Activities:** ₹3,290 spent of ₹6,000 cap (**₹2,710 remaining**)\n📦 **Misc & Souvenirs:** ₹2,082 spent of ₹6,000 cap (**₹3,918 remaining**)\n\n**Summary:** You have **₹33,828 INR remaining** across 5 more days (Safe daily pace: **₹6,765 / day**).",
        timestamp: 'Just now',
        metrics: [
          { label: 'Total Trip Budget', value: '₹60,000', sub: 'Europe Adventure' },
          { label: 'Total Spent', value: '₹26,172', sub: '44% utilized' },
          { label: 'Remaining Fund', value: '₹33,828', sub: '5 days left' },
          { label: 'Safe Daily Pace', value: '₹6,765/day', sub: 'comfortable runway' },
        ],
      }
    }

    // 5. HINDI / HINGLISH QUERIES
    if (q.includes('mera') || q.includes('kitna') || q.includes('kharcha') || q.includes('batao') || q.includes('paisa') || q.includes('aaj')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'assistant',
        text: "🇮🇳 **नमस्ते आयशा! यह रहा आपका पूरा बजट और खर्चा विवरण:**\n\n• **यूरोप ट्रिप कुल बजट:** ₹60,000\n• **अब तक का कुल खर्च:** **₹26,172**\n• **बची हुई राशि (Remaining):** **₹33,828 INR**\n• **ट्रिप में बाकी दिन:** 5 दिन\n• **दैनिक सुरक्षित सीमा (Safe Daily Spend):** **₹6,765 प्रति दिन**\n\n**सितंबर का कुल खर्च (सभी ट्रिप्स मिलाकर):** **₹37,792 INR**\n\nआप बिल्कुल सुरक्षित बजट में चल रही हैं! अगर कोई नया खर्च करना हो, तो मुझसे बेझिझक पूछ सकती हैं।",
        timestamp: 'Just now',
        tags: [{ label: 'Hindi Localized', color: 'bg-orange-50 text-orange-800 border-orange-200' }],
      }
    }

    // 6. FLIGHT & RETURN JOURNEY
    if (q.includes('flight') || q.includes('return') || q.includes('departure') || q.includes('hotel roma') || q.includes('airport')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'assistant',
        text: "Here are your **Departure & Flight Details for Day 8 (20 Sep)**:\n\n• **Hotel Roma Check-out:** 11:00 AM (Free luggage storage provided)\n• **Airport Express:** Leonardo Express train from Rome Termini at 03:30 PM (€14 / person)\n• **FCO Airport Arrival:** 04:10 PM (Terminal 3)\n• **Flight Details:** Air India / ITA Airways departing at **07:45 PM** to New Delhi (DEL).\n\nAll terminal passes and booking codes are synchronized in your offline itinerary wallet.",
        timestamp: 'Just now',
        tags: [{ label: 'Departure Details', color: 'bg-blue-50 text-blue-800 border-blue-200' }],
      }
    }

    // DEFAULT FALLBACK
    return {
      id: `msg_${Date.now()}`,
      sender: 'assistant',
      text: `Regarding "${query}":\n\nBased on your active **Europe Adventure** data, your remaining fund is **₹33,828** (5 days left, safe daily allowance **₹6,765/day**). Your total monthly spending across all trips in September is **₹37,792**.\n\nYou can also ask me about:\n• *Day-by-day itinerary & timings*\n• *Category budget limits (Food, Stay, Travel)*\n• *Affording specific purchases*\n• *Hindi budget questions*`,
      timestamp: 'Just now',
    }
  }

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text) return

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now',
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const hours = new Date().getHours()
      const slot: 'Morning' | 'Afternoon' | 'Evening' | 'Night' =
        hours < 12 ? 'Morning' : hours < 17 ? 'Afternoon' : hours < 21 ? 'Evening' : 'Night'
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

      const res = await queryGuardianCopilotWithLLM(text, {
        userId: 'usr_000000000001',
        displayName: 'Aisha Patel',
        tripTitle: 'Europe Adventure',
        destinationCity: 'Rome',
        currentLocalTime: timeStr,
        currentTimeSlot: slot,
        currentDayNumber: 4,
        totalDays: 8,
        daysRemaining: 4,
        totalTripBudget: 60000,
        totalSpentSoFar: 26172,
        safeDailyAllowance: 6765,
        currency: 'INR',
      })

      const reply: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: 'Just now',
        tags: res.tags,
        itineraryCards: res.itineraryCards,
        metrics: res.metrics,
      }
      setMessages((prev) => [...prev, reply])
    } catch {
      const reply = generateAIResponse(text)
      setMessages((prev) => [...prev, reply])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('trip-dashboard')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">AI Travel Guardian</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Ask about your daily itinerary, total monthly spend, category caps, or Hindi queries
          </p>
        </div>

        {/* Quick Runway Summary Banner */}
        <div className="p-3 bg-white border border-teal-100 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Safe Daily Limit</span>
            <span className="text-sm font-extrabold text-teal-800">₹6,765 / day</span>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Sept Total Spend</span>
            <span className="text-sm font-extrabold text-indigo-900">₹37,792</span>
          </div>
        </div>
      </div>

      {/* Dynamic Temporal Destination Clock Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-teal-50/80 via-emerald-50/70 to-slate-50 border border-teal-100 rounded-2xl text-xs">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-white text-teal-800 rounded-lg shadow-2xs font-extrabold flex items-center gap-1">
            <span>⏰</span> Rome Clock
          </span>
          <span className="font-bold text-slate-800">
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} CET
          </span>
          <span className="bg-teal-200/60 text-teal-900 font-semibold px-2 py-0.5 rounded-full text-[10px]">
            {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : new Date().getHours() < 21 ? 'Evening' : 'Night'} Slot
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Trip Progress:</span>
          <span className="font-extrabold text-teal-900 bg-white px-2 py-0.5 rounded-md border border-teal-100">
            Day 4 of 8 · 4 Days Left
          </span>
        </div>
      </div>

      {/* SUGGESTED PROMPT CHIPS */}
      <div>
        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Suggested Questions:
        </label>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className="text-xs font-medium bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900 px-3 py-1.5 rounded-xl transition shadow-2xs text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* CHAT CONTAINER */}
      <div className="bg-white rounded-3xl border border-teal-100 shadow-sm flex flex-col h-[520px] overflow-hidden">
        {/* Chat History Messages */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isMe = msg.sender === 'user'

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                    🤖
                  </div>
                )}

                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed space-y-2.5 ${
                    isMe
                      ? 'bg-teal-600 text-white shadow-xs rounded-tr-none'
                      : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {/* Message Tags */}
                  {msg.tags && msg.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {msg.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${t.color}`}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Body Text (rendered with markdown-like bold handling) */}
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

                  {/* Optional Itinerary Cards inside message */}
                  {msg.itineraryCards && (
                    <div className="space-y-2 pt-2">
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
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>⏰ {item.time}</span>
                            <span>{item.type}</span>
                          </div>
                          {item.note && (
                            <p className="text-[10px] text-slate-500 italic">“{item.note}”</p>
                          )}
                          {item.mapsUrl && (
                            <div className="pt-1">
                              <a
                                href={item.mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition"
                              >
                                🗺️ Open in Google Maps ↗
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Optional Financial Metrics Cards inside message */}
                  {msg.metrics && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {msg.metrics.map((m, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-100 rounded-xl p-2.5 shadow-2xs"
                        >
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{m.label}</p>
                          <p className="text-sm font-extrabold text-slate-900">{m.value}</p>
                          {m.sub && <p className="text-[10px] text-slate-400">{m.sub}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={`text-[10px] text-right ${isMe ? 'text-teal-100' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {isMe && (
                  <div className="w-9 h-9 rounded-xl bg-teal-800 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-xs">
                    You
                  </div>
                )}
              </div>
            )
          })}

          {isTyping && (
            <div className="flex gap-3 items-center">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center text-lg shrink-0">
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

        {/* Chat Input Bar */}
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
    </div>
  )
}
