import { useState, useRef, useEffect } from 'react'
import { type ChatMessage, queryGuardianKnowledgeAsync } from './guardianEngine'

export function useAIGuardianChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'guardian',
      text: `Hello Aisha! I am your **AI Travel Guardian & Copilot**.\n\nYou have **₹33,828 INR** remaining for Europe Adventure with a safe limit of **₹6,765 / day**.\n\nAsk me about today's itinerary, total monthly spend across all trips, or category caps!`,
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
      const response = await queryGuardianKnowledgeAsync(query)
      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'guardian',
        text: response.text,
        itineraryCards: response.itineraryCards,
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
