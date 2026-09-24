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

  // Ensure isShared and splitBetween are populated
  const richExpenses: Expense[] = expenses.map((e, idx) => ({
    ...e,
    isShared: e.isShared !== undefined ? e.isShared : idx !== 4, // 5th item is personal by default
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

  // Personal expenses (not trip based)
  const personalExpenses = richExpenses.filter((e) => !e.isShared && filterExpense(e))
  const personalTotal = personalExpenses.reduce((s, e) => s + e.convertedAmount, 0)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-7">
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Expenses Hub</h1>
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
            Personal spending hub & card-wise group trip ledgers
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
          CARD 1: PERSONAL EXPENSES CARD (FOR ANY TRIP / GENERAL SPENDING)
          Includes direct "Scan Receipt" and "+ Add Expense" actions
      ========================================================================= */}
      <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden ring-1 ring-indigo-50">
        {/* Card Header */}
        <div className="p-5 md:p-6 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/40 border-b border-indigo-100/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-sm">
                👤
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">
                    Personal & Flexible Expenses
                  </h2>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Any Trip / Individual
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Personal spending with customizable split members · Not locked to a trip budget
                </p>
              </div>
            </div>

            {/* DIRECT ACTION BUTTONS: SCAN & ADD EXPENSE */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('receipt-scanner')}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <span>📸 Scan Receipt</span>
              </button>
              <button
                onClick={() => navigate('add-expense')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <span>+ Add Expense</span>
              </button>
            </div>
          </div>

          {/* Personal Summary Pill */}
          <div className="mt-4 pt-3 border-t border-indigo-100/60 flex items-center justify-between text-xs text-indigo-900">
            <span>
              Total Personal Logged: <strong>₹{personalTotal.toLocaleString()} INR</strong> ({personalExpenses.length} items)
            </span>
            <span className="text-[11px] text-indigo-600 font-medium">
              💡 Does not impact group trip budget
            </span>
          </div>
        </div>

        {/* Card Content: List of Personal Expenses */}
        <div className="p-4 md:p-6 space-y-3">
          {personalExpenses.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <p>No personal expenses recorded yet.</p>
              <button
                onClick={() => navigate('add-expense')}
                className="mt-2 text-indigo-600 font-bold hover:underline"
              >
                + Add a personal expense or scan a receipt
              </button>
            </div>
          ) : (
            personalExpenses.map((exp) => {
              const splitMembers = exp.splitBetween || [exp.paidBy]
              const isMultiSplit = splitMembers.length > 1
              const perPersonShare = (exp.convertedAmount / splitMembers.length).toFixed(2)

              return (
                <div
                  key={exp.id}
                  className="bg-slate-50/70 border border-indigo-100/80 rounded-2xl p-4 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center text-xl shrink-0">
                        {catIcons[exp.category] || '🛍️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{exp.merchant}</h4>
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

                  {/* Personal Split Allocation Footer */}
                  <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-600 font-bold">
                        {isMultiSplit ? `👥 Split with ${splitMembers.length} people:` : '👤 Individual:'}
                      </span>
                      <span className="text-slate-700 font-medium truncate">
                        {splitMembers.map((m) => resolveMemberName(m)).join(', ')}
                      </span>
                    </div>

                    {isMultiSplit ? (
                      <span className="text-indigo-900 font-extrabold text-[11px]">
                        ₹{perPersonShare} / person
                      </span>
                    ) : (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200/60">
                        100% Personal
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* =========================================================================
          CARDS PER TRIP: DEDICATED CARD FOR EACH TRIP
          Shows expenses belonging specifically to that trip, split by total members
      ========================================================================= */}
      <div className="space-y-6">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">
          Trip-Specific Group Expenses (Split by Total Members)
        </h2>

        {trips.map((trip) => {
          // Filter shared expenses for this trip
          const tripSharedExpenses = richExpenses.filter(
            (e) => e.isShared && (e.tripId === trip.id || trip.id === 'europe') && filterExpense(e)
          )
          const tripTotalSpent = tripSharedExpenses.reduce((s, e) => s + e.convertedAmount, 0)
          const remaining = Math.max(0, trip.budget - tripTotalSpent)
          const pct = Math.round((tripTotalSpent / trip.budget) * 100)
          const groupCount = trip.partySize || 3

          return (
            <div
              key={trip.id}
              className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden"
            >
              {/* Trip Card Header */}
              <div className="p-5 md:p-6 bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/40 border-b border-teal-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧳</span>
                      <h3 className="text-lg md:text-xl font-bold text-slate-900">{trip.name}</h3>
                      <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {groupCount} Group Members
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {trip.destination} · {trip.startDate} – {trip.endDate}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('trip-dashboard')}
                    className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-2xs self-start sm:self-auto"
                  >
                    Open Trip Dashboard →
                  </button>
                </div>

                {/* Trip Budget Progress Bar */}
                <div className="bg-white p-3.5 rounded-2xl border border-teal-100/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      Total Spent: <strong className="text-slate-900">₹{tripTotalSpent.toLocaleString()}</strong> of ₹{trip.budget.toLocaleString()}
                    </span>
                    <span className="font-bold text-teal-800">{pct}% Used</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${pct > 80 ? 'bg-rose-500' : 'bg-teal-600'} transition-all`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Remaining Fund: ₹{remaining.toLocaleString()} {trip.currency}</span>
                    <span>All expenses split equally by {groupCount} members</span>
                  </div>
                </div>
              </div>

              {/* Trip Expenses List (Card-Wise for Each Expense) */}
              <div className="p-4 md:p-6 space-y-3.5">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold text-slate-600">
                    Group Expenses for this Trip ({tripSharedExpenses.length})
                  </p>
                  <span className="text-[11px] text-teal-700 font-semibold">
                    Automatic Largest-Remainder Split
                  </span>
                </div>

                {tripSharedExpenses.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No group expenses logged for {trip.name} yet.
                  </div>
                ) : (
                  tripSharedExpenses.map((exp) => {
                    const splitAmount = (exp.convertedAmount / groupCount).toFixed(2)
                    return (
                      /* INDIVIDUAL TRIP EXPENSE CARD */
                      <div
                        key={exp.id}
                        className="bg-white rounded-2xl border border-teal-100 shadow-2xs p-4 hover:shadow-md transition"
                      >
                        {/* Top: Merchant, Category, Amounts */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-xl shrink-0">
                              {catIcons[exp.category] || '🏨'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm">{exp.merchant}</h4>
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

                        {/* Bottom Split Box: Split Equally by Total Members */}
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
                  })
                )}
              </div>
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
