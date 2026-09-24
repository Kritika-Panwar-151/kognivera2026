import { useState, useMemo } from 'react'
import type { Trip, Expense } from '../../types'

export interface CategoryCapItem {
  id: string
  key: 'food' | 'accommodation' | 'transport' | 'activities' | 'misc'
  name: string
  icon: string
  cap: number
  spent: number
  pct: number
  overshoot: number
  status: 'ok' | 'warning' | 'breached'
  latestForeignExpense?: Expense
}

export interface BreachDetail {
  category: CategoryCapItem
  overshoot: number
  foreignTrigger?: {
    originalAmount: number
    currency: string
    convertedAmount: number
    merchant: string
  }
}

export function useCategoryCaps(trip?: Trip | null, expenses: Expense[] = []) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const budget = trip?.budget || 60000
  const currencySymbol = trip?.currency === 'EUR' ? '€' : trip?.currency === 'USD' ? '$' : '₹'

  // Strictly filter expenses belonging only to this trip
  const tripExpenses = useMemo(() => {
    if (!trip?.id) return []
    return (expenses || []).filter((e) => e.tripId === trip.id)
  }, [trip?.id, expenses])

  const categories: CategoryCapItem[] = useMemo(() => {
    const caps = trip?.categoryCaps || {
      accommodation: Math.round(budget * 0.35),
      food: Math.round(budget * 0.25),
      transport: Math.round(budget * 0.20),
      activities: Math.round(budget * 0.10),
      misc: Math.round(budget * 0.10),
    }

    const configs: Array<{
      id: string
      key: 'food' | 'accommodation' | 'transport' | 'activities' | 'misc'
      name: string
      icon: string
      cap: number
      aliases: string[]
    }> = [
      {
        id: 'cat_food',
        key: 'food',
        name: 'Food & Dining',
        icon: '🍽️',
        cap: caps.food,
        aliases: ['food', 'dining', 'food & dining', 'restaurant', 'meal', 'cafe', 'dinner', 'lunch'],
      },
      {
        id: 'cat_acc',
        key: 'accommodation',
        name: 'Stay / Accommodation',
        icon: '🏨',
        cap: caps.accommodation,
        aliases: ['accommodation', 'stay', 'hotel', 'airbnb', 'lodging', 'resort'],
      },
      {
        id: 'cat_trans',
        key: 'transport',
        name: 'Transport & Transit',
        icon: '🚗',
        cap: caps.transport,
        aliases: ['transport', 'transit', 'taxi', 'metro', 'train', 'flight', 'cab', 'uber'],
      },
      {
        id: 'cat_act',
        key: 'activities',
        name: 'Activities & Sightseeing',
        icon: '⭐',
        cap: caps.activities,
        aliases: ['activities', 'sightseeing', 'tours', 'tickets', 'museum', 'excursion'],
      },
      {
        id: 'cat_misc',
        key: 'misc',
        name: 'Shopping & Misc',
        icon: '🛍️',
        cap: caps.misc,
        aliases: ['shopping', 'misc', 'other', 'general', 'souvenir'],
      },
    ]

    return configs.map((cfg) => {
      // Find all expenses belonging to this category strictly from this trip
      const matchedExpenses = tripExpenses.filter((e) => {
        const cat = (e.category || '').toLowerCase()
        return cfg.aliases.some((a) => cat.includes(a))
      })

      // Calculate total converted spend using decimal fx rates
      const spent = matchedExpenses.reduce((sum, e) => sum + (e.convertedAmount || e.amount || 0), 0)
      const pct = cfg.cap > 0 ? Math.round((spent / cfg.cap) * 100) : 0
      const overshoot = Math.max(0, spent - cfg.cap)

      // Find any foreign currency expense in this category that contributed
      const foreignExp = matchedExpenses
        .slice()
        .reverse()
        .find((e) => e.currency && e.currency !== 'INR' && e.currency !== (trip?.currency || 'INR'))

      const status: 'ok' | 'warning' | 'breached' =
        spent > cfg.cap ? 'breached' : pct >= 80 ? 'warning' : 'ok'

      return {
        id: cfg.id,
        key: cfg.key,
        name: cfg.name,
        icon: cfg.icon,
        cap: cfg.cap,
        spent,
        pct,
        overshoot,
        status,
        latestForeignExpense: foreignExp || matchedExpenses[matchedExpenses.length - 1],
      }
    })
  }, [trip, tripExpenses, budget])

  // Active breached categories
  const breachedCategories = useMemo(
    () => categories.filter((c) => c.status === 'breached'),
    [categories]
  )

  const activeBreach = breachedCategories[0] || null

  const breachDetail: BreachDetail | null = useMemo(() => {
    if (!activeBreach) return null
    const fExp = activeBreach.latestForeignExpense
    return {
      category: activeBreach,
      overshoot: activeBreach.overshoot,
      foreignTrigger: fExp
        ? {
            originalAmount: fExp.amount,
            currency: fExp.currency,
            convertedAmount: fExp.convertedAmount || fExp.amount,
            merchant: fExp.merchant,
          }
        : undefined,
    }
  }, [activeBreach])

  const totalCap = categories.reduce((sum, c) => sum + c.cap, 0)
  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0)

  const toggleOpen = () => setIsOpen((prev) => !prev)
  const dismissAlert = () => setIsDismissed(true)

  return {
    isOpen,
    toggleOpen,
    categories,
    breachedCategories,
    activeBreach,
    breachDetail,
    isDismissed,
    dismissAlert,
    totalCap,
    totalSpent,
    currencySymbol,
  }
}
