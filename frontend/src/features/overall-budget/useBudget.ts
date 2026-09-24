import type { Trip, User, Expense } from '../common/types'

export function useBudget(trip: Trip, currentUser?: User, expenses?: Expense[]) {
  // Group Budget Metrics
  const budget = trip.budget || 60000
  const spent = trip.spent || 0
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
    trip.memberBudgets?.[userId] ??
    trip.personalBudget ??
    Math.round(budget / Math.max(trip.members?.length || 1, 1))

  // Calculate personal spend from expenses
  let personalSpent = 0
  if (expenses && expenses.length > 0) {
    expenses.forEach((e) => {
      const isPaidByMe =
        e.paidBy.toLowerCase().includes('you') ||
        e.paidBy === currentUser?.name ||
        e.paidBy === currentUser?.id
      const isSplitWithMe =
        e.splitBetween &&
        e.splitBetween.some(
          (m) =>
            m.toLowerCase().includes('you') ||
            m === currentUser?.name ||
            m === currentUser?.id
        )

      if (e.isShared && isSplitWithMe) {
        const shareCount = e.splitBetween ? e.splitBetween.length : 1
        personalSpent += Math.round(e.convertedAmount / shareCount)
      } else if (isPaidByMe) {
        personalSpent += e.convertedAmount
      }
    })
  } else {
    // Proportional fallback
    personalSpent = Math.round(spent / Math.max(trip.members?.length || 1, 1))
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
