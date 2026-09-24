import { useState } from 'react'
import type { Trip } from '../common/types'

export interface CategoryCapItem {
  id: string
  name: string
  icon: string
  cap: number
  spent: number
  pct: number
  status: 'ok' | 'warning' | 'exceeded'
}

export function useCategoryCaps(trip: Trip) {
  const [isOpen, setIsOpen] = useState(false)

  const categories: CategoryCapItem[] = [
    { id: 'cat_acc', name: 'Stay / Accommodation', icon: '🏨', cap: 21000, spent: 10468, pct: 50, status: 'ok' },
    { id: 'cat_food', name: 'Food & Dining', icon: '🍽️', cap: 15000, spent: 7850, pct: 52, status: 'ok' },
    { id: 'cat_trans', name: 'Transport', icon: '🚗', cap: 12000, spent: 4854, pct: 40, status: 'ok' },
    { id: 'cat_act', name: 'Activities & Sightseeing', icon: '⭐', cap: 6000, spent: 3000, pct: 50, status: 'ok' },
    { id: 'cat_misc', name: 'Misc & Shopping', icon: '🛍️', cap: 6000, spent: 0, pct: 0, status: 'ok' },
  ]

  const totalCap = categories.reduce((sum, c) => sum + c.cap, 0)
  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0)

  const toggleOpen = () => setIsOpen((prev) => !prev)

  return {
    isOpen,
    toggleOpen,
    categories,
    totalCap,
    totalSpent,
  }
}
