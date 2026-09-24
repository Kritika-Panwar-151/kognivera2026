import type { Trip, User, Expense } from '../common/types'
import { isUserMatch, getRegisteredUsers } from '../../services/userRegistry'
import { convertCurrency, getTripDestinationCurrency, isTripMatch } from '../../services/currencyService'

export function useBudget(trip?: Trip | null, currentUser?: User, expenses?: Expense[]) {
  const destCurr = getTripDestinationCurrency(trip)
  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const registeredUsers = getRegisteredUsers()

  // Filter expenses strictly belonging to this trip
  const tripExpenses = trip?.id
    ? (expenses || []).filter((e) => isTripMatch(e.tripId, trip.id))
    : []

  // 1. Calculate Group Budget in Destination Currency (B_dest)
  // Convert each member's personal budget from their Home Currency to Trip Destination Currency
  let groupBudgetDest = 0
  const activeMembers = (trip?.memberDetails || []).filter((m) => m.status === 'active' || !m.status)

  if (activeMembers.length > 0 && activeMembers.some((m) => (m.personalBudget || 0) > 0)) {
    activeMembers.forEach((m) => {
      const mUser = registeredUsers.find((u) => u.id === m.userId || u.name === m.userId)
      const mHomeCurr = (mUser?.homeCurrency || 'INR').toUpperCase()
      const mHomeBudget = m.personalBudget || 0
      groupBudgetDest += convertCurrency(mHomeBudget, mHomeCurr, destCurr)
    })
  } else if (trip?.memberBudgets && Object.keys(trip.memberBudgets).length > 0) {
    Object.entries(trip.memberBudgets).forEach(([mId, mHomeBudget]) => {
      const mUser = registeredUsers.find((u) => u.id === mId || u.name === mId)
      const mHomeCurr = (mUser?.homeCurrency || 'INR').toUpperCase()
      groupBudgetDest += convertCurrency(mHomeBudget || 0, mHomeCurr, destCurr)
    })
  } else {
    // Fallback: trip.budget converted to destCurr
    groupBudgetDest = convertCurrency(trip?.budget || 0, trip?.currency || destCurr, destCurr)
  }

  // Convert Group Budget in Destination Currency (B_dest) to viewing user's Home Currency
  const budget = convertCurrency(groupBudgetDest, destCurr, userHomeCurr)

  // 2. Calculate Group Spent in Destination Currency (S_dest)
  let totalSpentDest = 0
  tripExpenses.forEach((e) => {
    const eAmountDest = convertCurrency(e.amount, e.currency || destCurr, destCurr)
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

  // Calculate personal spend for currentUser using Upfront Cash Flow & Settlement Reimbursement
  let personalSpent = 0

  if (tripExpenses.length > 0) {
    tripExpenses.forEach((e) => {
      const isPaidByMe = isUserMatch(e.paidBy, currentUser)
      const isSplitWithMe =
        e.splitBetween && e.splitBetween.some((m) => isUserMatch(m, currentUser))
      const eAmountDest = convertCurrency(e.amount, e.currency || destCurr, destCurr)

      if (isPaidByMe) {
        // Payer paid the full amount upfront out of pocket -> deduct full amount initially
        const fullAmountHome = convertCurrency(eAmountDest, destCurr, userHomeCurr)
        personalSpent += fullAmountHome

        // If shared and settled by co-travelers, subtract non-payer settled shares (reimbursement)
        if (e.isShared && e.isSettled && e.splitBetween && e.splitBetween.length > 1) {
          const nonPayerCount = e.splitBetween.length - 1
          const reimbursedDest = (eAmountDest / e.splitBetween.length) * nonPayerCount
          const reimbursedHome = convertCurrency(reimbursedDest, destCurr, userHomeCurr)
          personalSpent -= reimbursedHome
        }
      } else if (e.isShared && isSplitWithMe && e.isSettled) {
        // Co-traveler only has their share deducted AFTER settling
        const shareCount = e.splitBetween ? e.splitBetween.length : (trip?.members?.length || 1)
        const shareDest = eAmountDest / shareCount
        const shareHome = convertCurrency(shareDest, destCurr, userHomeCurr)
        personalSpent += shareHome
      }
    })
  } else {
    personalSpent = spent > 0 ? Math.round(spent / Math.max(trip?.members?.length || 1, 1)) : 0
  }

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
