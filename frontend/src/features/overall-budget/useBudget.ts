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

  const daysTotal = 8
  const daysGone = 3
  const daysLeft = Math.max(daysTotal - daysGone, 1)

  const dailyAvg = daysGone > 0 ? Math.round(spent / daysGone) : 0
  const safeDaily = daysLeft > 0 ? Math.round(remaining / daysLeft) : 0
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
    personalSpent = spent > 0 ? Math.round(spent / Math.max(trip.members?.length || 1, 1)) : 0
  }

  const personalRemaining = Math.max(0, personalBudget - personalSpent)
  const personalPct =
    personalBudget > 0
      ? Math.min(100, Math.round((personalSpent / personalBudget) * 100))
      : 0
  const personalSafeDaily = daysLeft > 0 ? Math.round(personalRemaining / daysLeft) : 0

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
