import { useState, useRef, useEffect } from 'react'
import { type ChatMessage } from './guardianEngine'
import { askGeminiWithSessionGuard } from '../../services/geminiService'

export function useAIGuardianChat() {
  const getLoggedInUser = () => {
    try {
      const raw = localStorage.getItem('tripwallet_auth_user')
      if (raw) return JSON.parse(raw)
    } catch {}
    return { id: 'usr_000000000001', name: 'Aisha Rossi', role: 'owner' }
  }

  const currentUser = getLoggedInUser()

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'guardian',
      text: `Hello ${currentUser.name || 'Aisha'}! I am your **AI Travel Guardian & Copilot** powered by Google Gemini.\n\nYour session is anchored with a unique **Session ID** and **User ID** (\`${currentUser.id || 'usr_000000000001'}\`). Even if other members have the same name, your budget and transactions are tracked independently.\n\nAsk me about today's itinerary, total monthly spend across all trips, or category caps!`,
      time: '10:00 AM',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query) return

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: query,
      time: 'Just now',
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const geminiResp = await askGeminiWithSessionGuard(query, {
        userId: currentUser.id || 'usr_000000000001',
        displayName: currentUser.name || 'Aisha Rossi',
        role: currentUser.role || 'owner',
        tripId: 'trp_europe',
        tripTitle: 'Europe Adventure',
      })

      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'guardian',
        text: geminiResp.answer,
        traceId: geminiResp.traceId,
        sessionId: geminiResp.sessionId,
        time: 'Just now',
      }
      setMessages((prev) => [...prev, botMsg])
    } catch (err) {
      console.error('Error querying Guardian AI:', err)
    } finally {
      setIsTyping(false)
    }
  }

  return {
    messages,
    input,
    setInput,
    isTyping,
    handleSend,
    chatBottomRef,
  }
}
