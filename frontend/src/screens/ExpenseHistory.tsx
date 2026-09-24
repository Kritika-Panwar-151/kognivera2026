import { useState } from 'react'
import type { NavigateFn, Expense, Trip, User } from '../types'
import EditExpenseModal from '../components/EditExpenseModal'
import { resolveMemberName } from '../services/userRegistry'
import { formatUserDualCurrency, getTripDestinationCurrency, getCurrencySymbol } from '../services/currencyService'

interface Props {
  navigate: NavigateFn
  expenses: Expense[]
  trips?: Trip[]
  currentUser?: User | null
  onDeleteExpense?: (expenseId: string) => void
  onEditExpense?: (updated: Expense) => void
}

const defaultTrips: Trip[] = [
  {
    id: 'europe',
    name: 'Europe Adventure',
    destination: 'Rome & Paris, Europe',
    startDate: '12 Sep',
    endDate: '20 Sep 2026',
    currency: 'INR',
    budget: 60000,
    spent: 26172,
    partySize: 3,
    members: ['You (Aisha)', 'Ravi', 'Asha'],
    isGroupTrip: true,
  },
  {
    id: 'goa',
    name: 'Goa Getaway',
    destination: 'Goa, India',
    startDate: '2 Oct',
    endDate: '6 Oct 2026',
    currency: 'INR',
    budget: 25000,
    spent: 8420,
    partySize: 3,
    members: ['You (Aisha)', 'Pooja', 'Ravi'],
    isGroupTrip: true,
  },
]

const memberFilters = ['All Members', 'You (Aisha)', 'Ravi', 'Asha', 'David', 'Pooja']

const catColors: Record<string, string> = {
  Food: 'bg-orange-50 text-orange-700 border-orange-200',
  Transport: 'bg-blue-50 text-blue-700 border-blue-200',
  Accommodation: 'bg-teal-50 text-teal-800 border-teal-200',
  Activities: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Shopping: 'bg-pink-50 text-pink-700 border-pink-200',
  Other: 'bg-slate-50 text-slate-700 border-slate-200',
}

const catIcons: Record<string, string> = {
  Food: '🍽️',
  Transport: '🚗',
  Accommodation: '🏨',
  Activities: '⭐',
  Shopping: '🛍️',
  Other: '📦',
}

export default function ExpenseHistory({
  navigate,
  expenses,
  trips = defaultTrips,
  currentUser,
  onDeleteExpense,
  onEditExpense,
}: Props) {
  const [selectedMember, setSelectedMember] = useState('All Members')
  const [search, setSearch] = useState('')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()

  // Current trip (trips[0]) is expanded by default
  const defaultExpanded = trips.length > 0 ? [trips[0].id] : ['europe']
  const [expandedTripIds, setExpandedTripIds] = useState<string[]>(defaultExpanded)

  const toggleTripExpand = (tripId: string) => {
    setExpandedTripIds((prev) =>
      prev.includes(tripId) ? prev.filter((id) => id !== tripId) : [...prev, tripId]
    )
  }

  // Ensure isShared and splitBetween are populated
  const richExpenses: Expense[] = expenses.map((e, idx) => ({
    ...e,
    isShared: e.isShared !== undefined ? e.isShared : idx !== 4,
    splitBetween: e.splitBetween || (idx !== 4 ? ['You (Aisha)', 'Ravi', 'Asha'] : ['You (Aisha)']),
  }))

  // Helper for dual currency subtext on individual expense cards
  const getSecondarySubtext = (exp: Expense, tripDestCurr: string) => {
    const origCurr = (exp.currency || userHomeCurr).toUpperCase()
    if (origCurr !== userHomeCurr) {
      const sym = getCurrencySymbol(origCurr)
      return `Receipt: ${sym}${exp.amount.toLocaleString('en-IN')} ${origCurr}`
    }
    if (tripDestCurr.toUpperCase() !== userHomeCurr) {
      const dual = formatUserDualCurrency(exp.convertedAmount, userHomeCurr, userHomeCurr, tripDestCurr)
      return dual.secondary
    }
    return null
  }

  // 1-Click CSV Expense Report Exporter
  const exportToCSV = () => {
    const headers = [
      'Transaction ID',
      'Date',
      'Merchant',
      'Category',
      'Paid By',
      'Currency',
      'Original Amount',
      `Converted ${userHomeCurr} Amount`,
      'Split Type',
      'Split With',
    ]

    const rows = richExpenses.map((e) => [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${e.merchant.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${resolveMemberName(e.paidBy)}"`,
      `"${e.currency || userHomeCurr}"`,
      e.amount,
      e.convertedAmount,
      `"${e.isShared ? 'Group Shared' : 'Personal'}"`,
      `"${(e.splitBetween || [e.paidBy]).map((m) => resolveMemberName(m)).join('; ')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `TripWallet_Expenses_${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter helper
  const filterExpense = (e: Expense) => {
    if (selectedMember !== 'All Members') {
      const nameKey = selectedMember.toLowerCase().split(' ')[0]
      const isPayer = e.paidBy.toLowerCase().includes(nameKey)
      const isParticipant = e.splitBetween?.some((m) => m.toLowerCase().includes(nameKey))
      if (!isPayer && !isParticipant) return false
    }
    if (search && !e.merchant.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('trip-dashboard')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Expenses Hub</h1>
            <button
              type="button"
              onClick={exportToCSV}
              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Download CSV report"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          </div>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Trip-wise expense ledgers in your Home Currency ({userHomeCurr}) with destination currency subtext.
          </p>
        </div>

        {/* Global Controls: Search & Member Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchant..."
              className="border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {memberFilters.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* =========================================================================
          PROMINENT QUICK ACTION BAR (BELOW PAGE HEADER ONLY)
          Defaults to adding expenses to the active current trip
      ========================================================================= */}
      <div className="bg-white border border-teal-200/90 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ring-1 ring-teal-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xl font-bold shadow-xs">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">Add New Expense</h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                Defaults to: {trips[0]?.name || 'Current Active Trip'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Entries default to active destination ({trips[0]?.destination || 'Current Destination'}). Amounts convert to {userHomeCurr}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('receipt-scanner')}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-teal-300 text-teal-900 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-2xs"
          >
            <span>📸 Scan Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('add-expense')}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TRIP-WISE PRESENTATION (CURRENT TRIP EXPANDED BY DEFAULT)
          Home Country Currency (Primary) vs Active Trip Destination Currency (Subtext)
      ========================================================================= */}
      <div className="space-y-6">
        {trips.map((trip, tripIdx) => {
          const isCurrentTrip = tripIdx === 0
          const isExpanded = expandedTripIds.includes(trip.id)

          const tripDestCurr = getTripDestinationCurrency(trip)

          // Expenses belonging to this trip
          const tripExpenses = richExpenses.filter(
            (e) => (e.tripId === trip.id || (!e.tripId && isCurrentTrip)) && filterExpense(e)
          )

          const personalExpenses = tripExpenses.filter((e) => !e.isShared)
          const groupExpenses = tripExpenses.filter((e) => e.isShared)

          // 1. Calculate Personal and Group Totals in Trip Destination Currency (C_dest)
          let personalTotalDest = 0
          personalExpenses.forEach((e) => {
            personalTotalDest += convertCurrency(e.amount, e.currency || tripDestCurr, tripDestCurr)
          })

          let groupTotalDest = 0
          groupExpenses.forEach((e) => {
            groupTotalDest += convertCurrency(e.amount, e.currency || tripDestCurr, tripDestCurr)
          })

          const tripTotalSpentDest = personalTotalDest + groupTotalDest

          // 2. Group Budget in Destination Currency (C_dest)
          const tripBudgetDest = convertCurrency(trip.budget || 0, trip.currency || tripDestCurr, tripDestCurr)

          const groupCount = trip.partySize || trip.members?.length || 3
          const pct = tripBudgetDest > 0 ? Math.round((tripTotalSpentDest / tripBudgetDest) * 100) : 0

          // 3. Format Dual Currency for active userHomeCurr and tripDestCurr
          const budgetDual = formatUserDualCurrency(tripBudgetDest, tripDestCurr, userHomeCurr, tripDestCurr)
          const spentDual = formatUserDualCurrency(tripTotalSpentDest, tripDestCurr, userHomeCurr, tripDestCurr)
          const personalTotalDual = formatUserDualCurrency(personalTotalDest, tripDestCurr, userHomeCurr, tripDestCurr)
          const groupTotalDual = formatUserDualCurrency(groupTotalDest, tripDestCurr, userHomeCurr, tripDestCurr)

          return (
            <div
              key={trip.id}
              className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all duration-300 ${
                isCurrentTrip ? 'border-teal-300 ring-1 ring-teal-100' : 'border-slate-200'
              }`}
            >
              {/* Trip Header Banner (Collapsible Trigger) */}
              <div
                onClick={() => toggleTripExpand(trip.id)}
                className="cursor-pointer p-5 md:p-6 bg-gradient-to-r from-teal-50/90 via-white to-indigo-50/60 border-b border-teal-100/80"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xl">🧳</span>
                      <h3 className="text-lg md:text-xl font-extrabold text-slate-900">{trip.name}</h3>
                      {isCurrentTrip && (
                        <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                          📍 Active Destination
                        </span>
                      )}
                      <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {groupCount} Members
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      📍 {trip.destination} · {trip.startDate} – {trip.endDate}
                    </p>
                  </div>

                  {/* Right Header Dual Currency Status & Expand Toggle */}
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500 font-medium">Total Spent ({userHomeCurr})</p>
                      <p className="text-sm font-extrabold text-slate-900">
                        {spentDual.primary} {userHomeCurr}
                      </p>
                      {tripDestCurr !== userHomeCurr && (
                        <p className="text-[10px] text-teal-700 font-mono font-semibold">
                          {spentDual.secondary}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleTripExpand(trip.id)
                      }}
                      className="px-3.5 py-1.5 bg-white border border-teal-200 text-teal-800 font-extrabold rounded-xl text-xs hover:bg-teal-50 transition shadow-2xs"
                    >
                      {isExpanded ? '▲ Collapse' : '▼ Expand Trip'}
                    </button>
                  </div>
                </div>

                {/* Progress Bar Summary with Clean Dual Currency Labels */}
                <div className="mt-4 bg-white p-3.5 rounded-2xl border border-teal-100 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        Spent: <span className="text-teal-800 font-black">{spentDual.primary}</span>{' '}
                        <span className="text-xs text-slate-500 font-semibold">of {budgetDual.primary} ({userHomeCurr})</span>
                      </div>
                      {tripDestCurr !== userHomeCurr && (
                        <div className="text-[11px] font-bold text-teal-700 font-mono mt-0.5">
                          {spentDual.secondary} <span className="text-[10px] text-teal-600 font-normal">of {budgetDual.secondary.replace('≈ ', '')} ({tripDestCurr})</span>
                        </div>
                      )}
                    </div>
                    <span className="font-extrabold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-xl text-xs shrink-0">
                      {pct}% Used
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${pct > 80 ? 'bg-rose-500' : 'bg-teal-600'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* EXPANDED CONTENT: CLEAN PERSONAL & GROUP EXPENSES (NO REDUNDANT INTERNAL QUICK BAR) */}
              {isExpanded && (
                <div className="p-5 md:p-6 space-y-6 bg-slate-50/40">
                  {/* =========================================================================
                      SECTION A: PERSONAL EXPENSES FOR THIS TRIP
                  ========================================================================= */}
                  <div className="bg-white rounded-2xl p-4 md:p-5 border border-indigo-100 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-50 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👤</span>
                        <div>
                          <h4 className="text-sm font-black text-indigo-950">
                            Personal & Individual Expenses
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Individual spending incurred for {trip.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-indigo-800 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200 inline-block">
                          Personal Total: {personalTotalDual.primary} {userHomeCurr} ({personalExpenses.length} items)
                        </span>
                        {tripDestCurr !== userHomeCurr && (
                          <span className="text-[10px] text-indigo-600 font-mono font-semibold block mt-0.5">
                            {personalTotalDual.secondary}
                          </span>
                        )}
                      </div>
                    </div>

                    {personalExpenses.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No personal expenses logged for {trip.name} yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {personalExpenses.map((exp) => {
                          const expDestAmount = convertCurrency(exp.amount, exp.currency || tripDestCurr, tripDestCurr)
                          const expUserAmount = convertCurrency(expDestAmount, tripDestCurr, userHomeCurr)
                          const secText = getSecondarySubtext(exp, tripDestCurr)

                          return (
                            <div
                              key={exp.id}
                              className="bg-slate-50/80 border border-indigo-100/90 rounded-2xl p-3.5 transition hover:bg-white hover:shadow-2xs"
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl shrink-0 font-bold">
                                    {catIcons[exp.category] || '🛍️'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-bold text-slate-900 text-sm">{exp.merchant}</h5>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          catColors[exp.category] || 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {exp.category}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {exp.date} · Logged by <strong className="text-slate-700">{resolveMemberName(exp.paidBy)}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-slate-900 text-base">
                                      {getCurrencySymbol(userHomeCurr)}{expUserAmount.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-500">{userHomeCurr}</span>
                                    </p>
                                    {secText && (
                                      <p className="text-[11px] font-bold text-indigo-700 font-mono">
                                        {secText}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => setEditingExpense(exp)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                      title="Edit expense"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Delete expense "${exp.merchant}"?`)) {
                                          onDeleteExpense?.(exp.id)
                                        }
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      title="Delete expense"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="p-2 bg-white rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                                <span className="text-indigo-600 font-bold text-[11px]">👤 Individual Spend</span>
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                                  100% Personal Share
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* =========================================================================
                      SECTION B: GROUP SHARED EXPENSES FOR THIS TRIP
                  ========================================================================= */}
                  <div className="bg-white rounded-2xl p-4 md:p-5 border border-teal-100 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-teal-50 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👥</span>
                        <div>
                          <h4 className="text-sm font-black text-teal-950">
                            Group Shared Expenses
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Split equally across all {groupCount} group members
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200 inline-block">
                          Group Total: {groupTotalDual.primary} {userHomeCurr} ({groupExpenses.length} items)
                        </span>
                        {tripDestCurr !== userHomeCurr && (
                          <span className="text-[10px] text-teal-700 font-mono font-semibold block mt-0.5">
                            {groupTotalDual.secondary}
                          </span>
                        )}
                      </div>
                    </div>

                    {groupExpenses.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No group shared expenses logged for {trip.name} yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {groupExpenses.map((exp) => {
                          const expDestAmount = convertCurrency(exp.amount, exp.currency || tripDestCurr, tripDestCurr)
                          const expUserAmount = convertCurrency(expDestAmount, tripDestCurr, userHomeCurr)
                          const expUserShare = Math.round((expUserAmount / groupCount) * 100) / 100
                          const secText = getSecondarySubtext(exp, tripDestCurr)

                          return (
                            <div
                              key={exp.id}
                              className="bg-white rounded-2xl border border-teal-100 p-3.5 hover:shadow-sm transition"
                            >
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-xl shrink-0 font-bold">
                                    {catIcons[exp.category] || '🏨'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-bold text-slate-900 text-sm">{exp.merchant}</h5>
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          catColors[exp.category] || 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {exp.category}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {exp.date} · Paid by <strong className="text-teal-900">{resolveMemberName(exp.paidBy)}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="text-right shrink-0">
                                    <p className="font-extrabold text-slate-900 text-base">
                                      {getCurrencySymbol(userHomeCurr)}{expUserAmount.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-500">{userHomeCurr}</span>
                                    </p>
                                    {secText && (
                                      <p className="text-xs font-bold text-teal-700 font-mono">
                                        {secText}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => setEditingExpense(exp)}
                                      className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                      title="Edit expense"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Delete expense "${exp.merchant}"?`)) {
                                          onDeleteExpense?.(exp.id)
                                        }
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                      title="Delete expense"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="p-2.5 bg-teal-50/60 rounded-xl border border-teal-100 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold bg-teal-600 text-white px-1.5 py-0.5 rounded">
                                    Split by {groupCount}
                                  </span>
                                  <span className="text-slate-600 font-semibold text-[11px]">
                                    Each owes {getCurrencySymbol(userHomeCurr)}{expUserShare.toLocaleString('en-IN')} {userHomeCurr}
                                  </span>
                                </div>
                                {tripDestCurr !== userHomeCurr && (
                                  <span className="text-[10px] font-bold text-teal-700 font-mono">
                                    ≈ {getCurrencySymbol(tripDestCurr)}{(expDestAmount / groupCount).toFixed(2)} {tripDestCurr}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          isOpen={Boolean(editingExpense)}
          onClose={() => setEditingExpense(null)}
          onSave={(updated) => {
            onEditExpense?.(updated)
            setEditingExpense(null)
          }}
        />
      )}
    </div>
  )
}
