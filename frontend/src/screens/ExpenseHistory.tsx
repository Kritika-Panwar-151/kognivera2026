import { useState } from 'react'
import type { NavigateFn, Expense, Trip } from '../types'
import EditExpenseModal from '../components/EditExpenseModal'
import { resolveMemberName } from '../services/userRegistry'

interface Props {
  navigate: NavigateFn
  expenses: Expense[]
  trips?: Trip[]
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
  onDeleteExpense,
  onEditExpense,
}: Props) {
  const [selectedMember, setSelectedMember] = useState('All Members')
  const [search, setSearch] = useState('')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

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
      'Converted INR Amount',
      'Split Type',
      'Split With',
    ]

    const rows = richExpenses.map((e) => [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${e.merchant.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${resolveMemberName(e.paidBy)}"`,
      `"${e.currency || 'INR'}"`,
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
            Trip-wise expense ledgers with active trip expanded by default.
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
          TRIP-WISE PRESENTATION (CURRENT TRIP EXPANDED BY DEFAULT)
          Each trip contains BOTH Personal & Group Shared expenses inside it!
      ========================================================================= */}
      <div className="space-y-6">
        {trips.map((trip, tripIdx) => {
          const isCurrentTrip = tripIdx === 0
          const isExpanded = expandedTripIds.includes(trip.id)

          // Expenses belonging to this trip
          const tripExpenses = richExpenses.filter(
            (e) => (e.tripId === trip.id || (!e.tripId && isCurrentTrip)) && filterExpense(e)
          )

          const personalExpenses = tripExpenses.filter((e) => !e.isShared)
          const groupExpenses = tripExpenses.filter((e) => e.isShared)

          const personalTotal = personalExpenses.reduce((s, e) => s + e.convertedAmount, 0)
          const groupTotal = groupExpenses.reduce((s, e) => s + e.convertedAmount, 0)
          const tripTotalSpent = personalTotal + groupTotal

          const groupCount = trip.partySize || trip.members?.length || 3
          const pct = Math.round((tripTotalSpent / (trip.budget || 1)) * 100)

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

                  {/* Right Header Status & Expand Toggle */}
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-500 font-medium">Total Spent</p>
                      <p className="text-sm font-extrabold text-slate-900">
                        ₹{tripTotalSpent.toLocaleString()} INR
                      </p>
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

                {/* Progress Bar Summary */}
                <div className="mt-4 bg-white p-3 rounded-2xl border border-teal-100 flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between font-medium text-slate-600">
                      <span>Spent: <strong>₹{tripTotalSpent.toLocaleString()}</strong> of ₹{trip.budget.toLocaleString()}</span>
                      <span className="font-extrabold text-teal-800">{pct}% Used</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${pct > 80 ? 'bg-rose-500' : 'bg-teal-600'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* EXPANDED CONTENT: CONTAINS BOTH PERSONAL & GROUP EXPENSES FOR THIS TRIP */}
              {isExpanded && (
                <div className="p-5 md:p-6 space-y-6 bg-slate-50/40">
                  {/* Quick Action Bar inside Trip View */}
                  <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span>⚡ Quick Entry for {trip.name}:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('receipt-scanner')}
                        className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>📸 Scan Receipt</span>
                      </button>
                      <button
                        onClick={() => navigate('add-expense')}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <span>+ Add Expense</span>
                      </button>
                    </div>
                  </div>

                  {/* =========================================================================
                      SECTION A: PERSONAL EXPENSES FOR THIS TRIP
                  ========================================================================= */}
                  <div className="bg-white rounded-2xl p-4 md:p-5 border border-indigo-100 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-50">
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
                      <span className="text-xs font-extrabold text-indigo-800 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                        Personal Total: ₹{personalTotal.toLocaleString()} INR ({personalExpenses.length} items)
                      </span>
                    </div>

                    {personalExpenses.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No personal expenses logged for {trip.name} yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {personalExpenses.map((exp) => (
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
                                    {exp.currency === 'EUR' ? '€' : exp.currency === 'USD' ? '$' : '₹'}
                                    {exp.amount.toLocaleString()}
                                  </p>
                                  <p className="text-[11px] font-bold text-indigo-700">
                                    ≈ ₹{exp.convertedAmount.toLocaleString()} INR
                                  </p>
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
                        ))}
                      </div>
                    )}
                  </div>

                  {/* =========================================================================
                      SECTION B: GROUP SHARED EXPENSES FOR THIS TRIP
                  ========================================================================= */}
                  <div className="bg-white rounded-2xl p-4 md:p-5 border border-teal-100 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-teal-50">
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
                      <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
                        Group Total: ₹{groupTotal.toLocaleString()} INR ({groupExpenses.length} items)
                      </span>
                    </div>

                    {groupExpenses.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No group shared expenses logged for {trip.name} yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {groupExpenses.map((exp) => {
                          const splitAmount = (exp.convertedAmount / groupCount).toFixed(2)
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
                                      {exp.currency === 'EUR' ? '€' : exp.currency === 'USD' ? '$' : '₹'}
                                      {exp.amount.toLocaleString()}
                                    </p>
                                    <p className="text-xs font-bold text-teal-700">
                                      ≈ ₹{exp.convertedAmount.toLocaleString()} INR
                                    </p>
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
                                  <span className="text-teal-900 text-xs">
                                    {trip.members ? trip.members.map((m) => resolveMemberName(m)).join(', ') : 'All Group Members'}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-[10px] text-teal-600 block leading-none">Per Member</span>
                                  <span className="text-xs font-extrabold text-teal-900">
                                    ₹{splitAmount}
                                  </span>
                                </div>
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
