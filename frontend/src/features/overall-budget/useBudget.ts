import type { Trip, User, Expense } from '../common/types'

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
    const start = new Date(trip.startDate)
    const end = new Date(trip.endDate)
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffMs = end.getTime() - start.getTime()
      daysTotal = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1)

      const today = new Date()
      const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
      const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

      if (todayMidnight < startMidnight) {
        // Trip has not started yet
        daysGone = 0
      } else if (todayMidnight > endMidnight) {
        // Trip finished
        daysGone = daysTotal
      } else {
        // Trip in progress
        const goneMs = todayMidnight - startMidnight
        daysGone = Math.min(daysTotal, Math.max(0, Math.floor(goneMs / (1000 * 60 * 60 * 24)) + 1))
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
  const isCurrentUserOwner =
    !currentUser ||
    currentUser.id === 'usr_you' ||
    currentUser.id === 'usr_aisha' ||
    currentUser.name?.toLowerCase().includes('you')

  if (tripExpenses.length > 0) {
    tripExpenses.forEach((e) => {
      const isPaidByMe =
        e.paidBy === currentUser?.name ||
        e.paidBy === currentUser?.id ||
        (isCurrentUserOwner && e.paidBy.toLowerCase().includes('you'))

      const isSplitWithMe =
        e.splitBetween &&
        e.splitBetween.some(
          (m) =>
            m === currentUser?.name ||
            m === currentUser?.id ||
            (isCurrentUserOwner && m.toLowerCase().includes('you'))
        )

      if (e.isShared && isSplitWithMe) {
        const shareCount = e.splitBetween ? e.splitBetween.length : 1
        personalSpent += Math.round(e.convertedAmount / shareCount)
      } else if (isPaidByMe) {
        personalSpent += e.convertedAmount
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
