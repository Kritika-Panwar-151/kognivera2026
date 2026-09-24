import type { Trip, User, Expense } from '../common/types'
import { isUserMatch } from '../../services/userRegistry'

export function useBudget(trip?: Trip | null, currentUser?: User, expenses?: Expense[]) {
  // Filter expenses strictly belonging to this trip
  const tripExpenses = trip?.id ? (expenses || []).filter((e) => e.tripId === trip.id) : []
  const tripExpenseSum = tripExpenses.reduce((sum, e) => sum + (e.convertedAmount || 0), 0)

  // Group Budget Metrics
  const budget = trip?.budget || 0
  const spent = trip?.spent && trip?.spent > 0 ? trip.spent : tripExpenseSum
  const remaining = Math.max(0, budget - spent)
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0

  // Dynamic calculation of days from startDate & endDate (no hardcoded demo numbers)
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
        // Trip has not started yet
        daysGone = 0
      } else if (todayMidnight > end) {
        // Trip finished
        daysGone = daysTotal
      } else {
        // Trip in progress
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

  // Personal Budget Metrics for Logged-In User
  const userId = currentUser?.id || 'usr_you'
  const personalBudget =
    trip?.memberBudgets?.[userId] ??
    trip?.personalBudget ??
    Math.round(budget / Math.max(trip?.members?.length || 1, 1))

  // Calculate personal spend from trip expenses
  let personalSpent = 0

  if (tripExpenses.length > 0) {
    tripExpenses.forEach((e) => {
      const isPaidByMe = isUserMatch(e.paidBy, currentUser)
      const isSplitWithMe =
        e.splitBetween && e.splitBetween.some((m) => isUserMatch(m, currentUser))

      if (e.isShared && isSplitWithMe) {
        const shareCount = e.splitBetween ? e.splitBetween.length : (trip?.members?.length || 1)
        personalSpent += Math.round((e.convertedAmount || 0) / shareCount)
      } else if (!e.isShared && isPaidByMe) {
        personalSpent += (e.convertedAmount || 0)
      } else if (isPaidByMe) {
        personalSpent += (e.convertedAmount || 0)
      }
    })
  } else {
    // If no expenses logged for this trip, personal spend is 0 (or proportional if trip.spent exists)
    personalSpent = spent > 0 ? Math.round(spent / Math.max(trip?.members?.length || 1, 1)) : 0
  }

  const personalRemaining = Math.max(0, personalBudget - personalSpent)
  const personalPct =
    personalBudget > 0
      ? Math.min(100, Math.round((personalSpent / personalBudget) * 100))
      : 0
  const personalSafeDaily = Math.max(1, daysLeft) > 0 ? Math.round(personalRemaining / Math.max(1, daysLeft)) : personalRemaining

  return {
    // Group Level
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

    // Personal Level (for current user)
    personalBudget,
    personalSpent,
    personalRemaining,
    personalPct,
    personalSafeDaily,
  }
}
