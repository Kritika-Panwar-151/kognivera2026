import type { Trip, User, Expense } from '../common/types'
import { useBudget } from './useBudget'
import { formatUserDualCurrency, getTripDestinationCurrency } from '../../services/currencyService'

interface Props {
  trip: Trip
  currentUser?: User
  expenses?: Expense[]
  onEditPersonalBudget?: () => void
}

export default function BudgetStatsCards({ trip, currentUser, expenses, onEditPersonalBudget }: Props) {
  const {
    budget,
    spent,
    personalBudget,
    personalSpent,
    daysGone,
    daysTotal,
    daysLeft,
  } = useBudget(trip, currentUser, expenses)

  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const tripDestCurr = getTripDestinationCurrency(trip)

  const groupBudgetDual = formatUserDualCurrency(budget, userHomeCurr, userHomeCurr, tripDestCurr)
  const personalBudgetDual = formatUserDualCurrency(personalBudget, userHomeCurr, userHomeCurr, tripDestCurr)
  const groupSpentDual = formatUserDualCurrency(spent, userHomeCurr, userHomeCurr, tripDestCurr)
  const personalSpentDual = formatUserDualCurrency(personalSpent, userHomeCurr, userHomeCurr, tripDestCurr)

  const cards = [
    {
      label: 'Group Trip Budget',
      primary: groupBudgetDual.primary,
      secondary: groupBudgetDual.secondary,
      sub: `Sum of all ${trip.members?.length || 1} members' budgets`,
      icon: '👥',
      accent: 'border-teal-200 bg-white',
    },
    {
      label: 'My Personal Budget',
      primary: personalBudgetDual.primary,
      secondary: personalBudgetDual.secondary,
      sub: `Home budget (${userHomeCurr})`,
      icon: '👤',
      accent: 'border-indigo-200 bg-indigo-50/40',
      action: onEditPersonalBudget ? 'Edit' : undefined,
    },
    {
      label: 'Group Spent to Date',
      primary: groupSpentDual.primary,
      secondary: groupSpentDual.secondary,
      sub: `${daysGone} of ${daysTotal} days used`,
      icon: '🧾',
      accent: 'border-slate-200 bg-white',
    },
    {
      label: 'My Personal Spend',
      primary: personalSpentDual.primary,
      secondary: personalSpentDual.secondary,
      sub: `${daysLeft} days remaining`,
      icon: '💳',
      accent: 'border-emerald-200 bg-white',
      green: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {cards.map((c, i) => (
        <div key={i} className={`rounded-3xl border shadow-sm p-4 relative ${c.accent}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xl">{c.icon}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</span>
          </div>
          <p className={`text-xl font-extrabold ${c.green ? 'text-teal-800' : 'text-slate-900'}`}>{c.primary}</p>
          <p className="text-[11px] text-teal-700 font-mono font-medium block">≈ {c.secondary}</p>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 truncate">{c.sub}</p>
            {c.action && (
              <button
                type="button"
                onClick={onEditPersonalBudget}
                className="text-[10px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2 py-0.5 rounded-md transition"
              >
                {c.action}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
