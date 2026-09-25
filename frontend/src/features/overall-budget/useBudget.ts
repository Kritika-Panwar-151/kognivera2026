import { useState, useEffect } from 'react'
import type { Trip, User, Expense } from '../common/types'
import { isUserMatch, getRegisteredUsers } from '../../services/userRegistry'
import { convertCurrency, getTripDestinationCurrency, isTripMatch } from '../../services/currencyService'
import { calculateHareMemberBreakdown } from '../../features/group-settlement/largestRemainder'

export function useBudget(trip?: Trip | null, currentUser?: User, expenses?: Expense[]) {
  const [settlementVersion, setSettlementVersion] = useState(0)

  useEffect(() => {
    const handleUpdate = () => setSettlementVersion((v) => v + 1)
    window.addEventListener('tripwallet_settlement_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('tripwallet_settlement_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])
  const destCurr = getTripDestinationCurrency(trip)
  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const registeredUsers = getRegisteredUsers()

  // Filter expenses strictly belonging to this trip
  const tripExpenses = trip?.id
    ? (expenses || []).filter((e) => isTripMatch(e.tripId, trip.id))
    : []

  // 1. Calculate Group Budget in Destination Currency (B_dest)
  let activeMembersSumDest = 0
  const activeMembers = (trip?.memberDetails || []).filter((m) => m.status === 'active' || !m.status)

  if (activeMembers.length > 0 && activeMembers.some((m) => (m.personalBudget || 0) > 0)) {
    activeMembers.forEach((m) => {
      const mUser = registeredUsers.find((u) => u.id === m.userId || u.name === m.userId)
      const mHomeCurr = (mUser?.homeCurrency || userHomeCurr).toUpperCase()
      const mHomeBudget = m.personalBudget || 0
      activeMembersSumDest += convertCurrency(mHomeBudget, mHomeCurr, destCurr)
    })
  } else if (trip?.memberBudgets && Object.keys(trip.memberBudgets).length > 0) {
    Object.entries(trip.memberBudgets).forEach(([mId, mHomeBudget]) => {
      const mUser = registeredUsers.find((u) => u.id === mId || u.name === mId)
      const mHomeCurr = (mUser?.homeCurrency || userHomeCurr).toUpperCase()
      activeMembersSumDest += convertCurrency(mHomeBudget || 0, mHomeCurr, destCurr)
    })
  }

  const rawTripBudgetDest = convertCurrency(trip?.budget || 0, userHomeCurr, destCurr)
  const groupBudgetDest = activeMembersSumDest > 0 ? activeMembersSumDest : rawTripBudgetDest

  // Convert Group Budget in Destination Currency (B_dest) to viewing user's Home Currency
  const budget = convertCurrency(groupBudgetDest, destCurr, userHomeCurr)

  // 2. Calculate Group Spent in Destination Currency (S_dest)
  let totalSpentDest = 0
  tripExpenses.forEach((e) => {
    const eAmountDest = convertCurrency(e.amount, e.currency || userHomeCurr, destCurr)
    totalSpentDest += eAmountDest
  })

  // Convert Group Spent in Destination Currency (S_dest) to viewing user's Home Currency
  const spent = convertCurrency(totalSpentDest, destCurr, userHomeCurr)
  const remaining = Math.max(0, budget - spent)
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0

  // Dynamic calculation of days from startDate & endDate
  let daysTotal = 1
  let daysGone = 0
  let daysLeft = 1

  if (trip?.startDate && trip?.endDate) {
    const parseLocalDate = (str: string) => {
      const p = str.split('-')
      if (p.length === 3) return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]))
      return new Date(str)
    }
    const start = parseLocalDate(trip.startDate)
    const end = parseLocalDate(trip.endDate)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffMs = end.getTime() - start.getTime()
      daysTotal = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1)

      const now = new Date()
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      if (todayMidnight < start) {
        daysGone = 0
      } else if (todayMidnight > end) {
        daysGone = daysTotal
      } else {
        const goneMs = todayMidnight.getTime() - start.getTime()
        daysGone = Math.min(daysTotal, Math.max(1, Math.floor(goneMs / (1000 * 60 * 60 * 24)) + 1))
      }
      daysLeft = Math.max(0, daysTotal - daysGone)
    }
  }

  const dailyAvg = daysGone > 0 ? Math.round(spent / daysGone) : 0
  const safeDaily = Math.max(1, daysLeft) > 0 ? Math.round(remaining / Math.max(1, daysLeft)) : remaining
  const projectedTotal = spent + dailyAvg * daysLeft
  const isOverBudgetProjected = projectedTotal > budget

  // 3. Personal Budget Metrics for Logged-In User
  const userId = currentUser?.id || 'usr_you'
  const foundMember = trip?.memberDetails?.find((m) => isUserMatch(m.userId, currentUser))
  const personalBudget =
    foundMember?.personalBudget ??
    trip?.memberBudgets?.[userId] ??
    trip?.personalBudget ??
    Math.round(budget / Math.max(trip?.members?.length || 1, 1))

  // Helper to read persistent set of settled debt IDs
  const getSettledIds = (): Set<string> => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('tripwallet_settled_debt_ids')
        return stored ? new Set(JSON.parse(stored)) : new Set()
      }
    } catch {}
    return new Set()
  }

  const settledIds = getSettledIds()

  // Out-of-pocket cash paid vs reimbursements received from settled co-member debts
  let personalGrossSpent = 0
  let personalReimbursementsReceived = 0

  if (tripExpenses.length > 0) {
    tripExpenses.forEach((e) => {
      const eAmountHome = convertCurrency(e.convertedAmount || e.amount, e.currency || userHomeCurr, userHomeCurr)
      const isPaidByMe = isUserMatch(e.paidBy, currentUser)
      const splitMembers = e.splitBetween && e.splitBetween.length > 0 ? e.splitBetween : (trip?.members || ['usr_you'])
      const isSplitWithMe = splitMembers.some((m) => isUserMatch(m, currentUser))

      if (isPaidByMe) {
        // Payer paid full cash out of pocket upfront -> deducted from personal budget
        personalGrossSpent += Math.round(eAmountHome)

        // If shared with others, check which co-members have settled their debt back to Payer
        if (e.isShared && splitMembers.length > 1) {
          const shareMap = e.splitBreakdown || calculateHareMemberBreakdown(eAmountHome, splitMembers)

          splitMembers.forEach((m) => {
            if (!isUserMatch(m, currentUser)) {
              const matchedKey = Object.keys(shareMap).find((k) => isUserMatch(k, { id: m, name: m }))
              const memberShare = matchedKey && shareMap[matchedKey] !== undefined
                ? Math.round(shareMap[matchedKey])
                : Math.round(eAmountHome / Math.max(splitMembers.length, 1))

              const debtKey = `debt_${e.id}_${m}`
              const isMemberSettled = e.isSettled || settledIds.has(e.id) || settledIds.has(debtKey)

              if (isMemberSettled) {
                // Settled money received -> credited back / added to Payer's personal budget
                personalReimbursementsReceived += memberShare
              }
            }
          })
        }
      } else if (isSplitWithMe) {
        // Someone else paid, user owes their fair share
        const shareMap = e.splitBreakdown || calculateHareMemberBreakdown(eAmountHome, splitMembers)
        const matchedKey = Object.keys(shareMap).find((k) => isUserMatch(k, currentUser))
        const myShare = matchedKey && shareMap[matchedKey] !== undefined
          ? Math.round(shareMap[matchedKey])
          : Math.round(eAmountHome / Math.max(splitMembers.length, 1))

        personalGrossSpent += myShare
      }
    })
  }

  const personalSpent = Math.max(0, personalGrossSpent - personalReimbursementsReceived)

  const personalRemaining = Math.max(0, personalBudget - personalSpent)
  const personalPct =
    personalBudget > 0
      ? Math.min(100, Math.round((personalSpent / personalBudget) * 100))
      : 0
  const personalSafeDaily = Math.max(1, daysLeft) > 0 ? Math.round(personalRemaining / Math.max(1, daysLeft)) : personalRemaining

  return {
    // Group Level (in viewing user's Home Currency)
    budget,
    spent,
    remaining,
    pct,
    daysTotal,
    daysGone,
    daysLeft,
    dailyAvg,
    safeDaily,
    projectedTotal,
    isOverBudgetProjected,

    // Personal Level (in viewing user's Home Currency)
    personalBudget,
    personalSpent,
    personalRemaining,
    personalPct,
    personalSafeDaily,
  }
}
