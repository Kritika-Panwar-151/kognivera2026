import { useState } from 'react'
import type { Trip, User, Expense } from '../common/types'
import { useBudget } from './useBudget'

interface Props {
  trip: Trip
  currentUser?: User
  expenses?: Expense[]
}

export default function BudgetDonutGauge({ trip, currentUser, expenses }: Props) {
  const [viewMode, setViewMode] = useState<'group' | 'personal'>('group')
  const {
    budget,
    spent,
    remaining,
    pct,
    safeDaily,
    personalBudget,
    personalSpent,
    personalRemaining,
    personalPct,
    personalSafeDaily,
  } = useBudget(trip, currentUser, expenses)

  const isPersonal = viewMode === 'personal'
  const activeBudget = isPersonal ? personalBudget : budget
  const activeSpent = isPersonal ? personalSpent : spent
  const activeRemaining = isPersonal ? personalRemaining : remaining
  const activePct = isPersonal ? personalPct : pct
  const activeRunway = isPersonal ? personalSafeDaily : safeDaily

  const radius = 72
  const circ = 2 * Math.PI * radius
  const strokeDashoffset = circ - (activePct / 100) * circ

  const currencySymbol = trip.currency === 'USD' ? '$' : trip.currency === 'EUR' ? '€' : '₹'

  return (
    <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-5 md:p-6 mb-6">
      {/* Switcher Header: Group Budget vs My Personal Budget */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">{isPersonal ? '👤' : '👥'}</span>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm md:text-base">
              {isPersonal ? 'My Personal Budget' : 'Group Travel Budget'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isPersonal
                ? 'Your individual financial allocation for this trip'
                : `Total collective fund pooled across all ${trip.members?.length || 1} members`}
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('group')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'group'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            👥 Group
          </button>
          <button
            type="button"
            onClick={() => setViewMode('personal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              viewMode === 'personal'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            👤 Mine
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* DONUT GAUGE VISUAL */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="14" />
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={isPersonal ? '#6366F1' : activePct > 80 ? '#F43F5E' : '#0D9488'}
              strokeWidth="14"
              strokeDasharray={circ}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-extrabold text-slate-900">{activePct}%</span>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isPersonal ? 'My Share' : 'Group Used'}
            </span>
          </div>
        </div>

        {/* FINANCIAL SUMMARY HIGHLIGHTS */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isPersonal ? 'My Personal Budget Allocation' : 'Total Group Trip Budget'}
            </span>
            <span className="text-sm font-bold text-slate-900">
              {currencySymbol}{activeBudget.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isPersonal ? 'My Spent to Date' : 'Group Spent to Date'}
            </span>
            <span className={`text-sm font-bold ${isPersonal ? 'text-indigo-700' : 'text-teal-800'}`}>
              {currencySymbol}{activeSpent.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-semibold text-slate-500">
              {isPersonal ? 'My Remaining Balance' : 'Group Remaining Balance'}
            </span>
            <span className="text-sm font-extrabold text-emerald-700">
              {currencySymbol}{activeRemaining.toLocaleString()}
            </span>
          </div>

          <div className={`p-3 rounded-2xl flex items-center justify-between ${
            isPersonal ? 'bg-indigo-50 border border-indigo-100' : 'bg-teal-50 border border-teal-100'
          }`}>
            <span className={`text-xs font-bold ${isPersonal ? 'text-indigo-900' : 'text-teal-900'}`}>
              {isPersonal ? 'My Safe Daily Runway' : 'Group Safe Daily Runway'}
            </span>
            <span className={`text-sm font-extrabold ${isPersonal ? 'text-indigo-800' : 'text-teal-800'}`}>
              {currencySymbol}{activeRunway.toLocaleString()} / day
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
