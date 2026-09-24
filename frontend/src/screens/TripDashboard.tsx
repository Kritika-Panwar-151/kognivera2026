import type { NavigateFn, Trip, Expense, User } from '../types'
import { useState } from 'react'
import { useBudget } from '../features/overall-budget/useBudget'
import { getRegisteredUsers } from '../services/userRegistry'

interface Props {
  navigate: NavigateFn
  trip?: Trip | null
  expenses: Expense[]
  currentUser?: User | null
  onUpdateMemberBudget?: (tripId: string, userId: string, newBudget: number) => void
}

const defaultCategories = [
  { name: 'Accommodation', amount: 8500, cap: 21000, color: 'bg-teal-500' },
  { name: 'Food', amount: 7200, cap: 15000, color: 'bg-orange-400' },
  { name: 'Transport', amount: 5100, cap: 12000, color: 'bg-sky-500' },
  { name: 'Activities', amount: 3372, cap: 6000, color: 'bg-emerald-500' },
  { name: 'Shopping', amount: 2000, cap: 6000, color: 'bg-rose-400' },
]

const catIcons: Record<string, React.ReactNode> = {
  Food: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </svg>
  ),
  Accommodation: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Transport: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Activities: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Shopping: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
}

function DonutChart({ pct, isPersonal }: { pct: number; isPersonal?: boolean }) {
  const r = 72
  const circ = 2 * Math.PI * r
  const filled = (Math.min(pct, 100) / 100) * circ

  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke="#E5F4F2"
        strokeWidth="14"
      />
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke={isPersonal ? '#6366F1' : pct > 80 ? '#F43F5E' : pct > 60 ? '#F59E0B' : '#0D9488'}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={circ * 0.25}
        transform="rotate(-90 90 90)"
      />
      <text
        x="90"
        y="84"
        textAnchor="middle"
        fill="#123B3A"
        fontSize="27"
        fontWeight="700"
        fontFamily="Inter, sans-serif"
      >
        {pct}%
      </text>
      <text
        x="90"
        y="105"
        textAnchor="middle"
        fill="#6B8583"
        fontSize="12"
        fontFamily="Inter, sans-serif"
      >
        {isPersonal ? 'My Share Used' : 'Group Budget Used'}
      </text>
    </svg>
  )
}

export default function TripDashboard({ navigate, trip, expenses, currentUser, onUpdateMemberBudget }: Props) {
  const activeUser = currentUser || {
    id: 'usr_you',
    name: 'You (Aisha)',
    email: 'aisha.rossi@example.invalid',
    homeCurrency: 'INR',
    avatar: '👩🏽',
    role: 'Owner',
  }

  // Dual-tier Budget state (Group vs Personal)
  const [budgetViewMode, setBudgetViewMode] = useState<'group' | 'personal'>('group')
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false)
  const [editedBudgetInput, setEditedBudgetInput] = useState('')

  // Accordion state for expenses expansion card below travel budget
  const [isExpensesExpanded, setIsExpensesExpanded] = useState(false)

  // Memories
  const [memories, setMemories] = useState<string[]>([
    'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=85',
  ])

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setMemories((previous) => [...previous, reader.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  // Clean Empty State for New Accounts with 0 Trips
  if (!trip) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl border border-teal-100 shadow-xl p-8 max-w-md w-full animate-in fade-in">
          <div className="w-20 h-20 bg-teal-50 border border-teal-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-2xs">
            ✈️
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Welcome, {activeUser.name.split(' ')[0]}!
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-2 mb-6 leading-relaxed">
            You don't have any active trips planned yet. Create your first trip to set up your personal budget, invite travel companions, and start tracking receipts.
          </p>

          <button
            type="button"
            onClick={() => navigate('create-trip')}
            className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-700/20 transition flex items-center justify-center gap-2 text-sm"
          >
            <span className="text-lg leading-none">+</span>
            <span>Plan Your First Trip</span>
          </button>
        </div>
      </div>
    )
  }

  // Calculations from useBudget
  const {
    budget,
    spent,
    remaining,
    pct,
    safeDaily,
    dailyAvg,
    projectedTotal: projectedFinal,
    isOverBudgetProjected,
    personalBudget,
    personalSpent,
    personalRemaining,
    personalPct,
    personalSafeDaily,
    daysGone,
    daysTotal,
    daysLeft,
  } = useBudget(trip, activeUser, expenses)

  const projectedOver = isOverBudgetProjected ? projectedFinal - budget : 0
  const currencySymbol = trip.currency === 'USD' ? '$' : trip.currency === 'EUR' ? '€' : '₹'

  // Look up registered users to display members dynamically
  const registeredUsers = getRegisteredUsers()
  const partyMembers = (trip.members || ['usr_you', 'usr_ravi', 'usr_asha']).map((memberId) => {
    const found = registeredUsers.find((u) => u.id === memberId)
    const detail = trip.memberDetails?.find((d) => d.userId === memberId)
    const isPending = detail ? detail.status === 'pending' : false
    const personalAllocation =
      trip.memberBudgets?.[memberId] ??
      (memberId === activeUser.id ? personalBudget : isPending ? 0 : Math.round(budget / Math.max(trip.members?.length || 1, 1)))

    return {
      id: memberId,
      name: found ? found.name : memberId === activeUser.id ? activeUser.name : memberId,
      avatar: found ? found.avatar : '👤',
      isMe: memberId === activeUser.id,
      budget: personalAllocation,
      isPending,
    }
  })

  const openBudgetEditor = () => {
    setEditedBudgetInput(personalBudget.toString())
    setIsEditBudgetOpen(true)
  }

  const handleSavePersonalBudget = (e: React.FormEvent) => {
    e.preventDefault()
    const newAmount = parseFloat(editedBudgetInput)
    if (!isNaN(newAmount) && newAmount >= 0 && onUpdateMemberBudget) {
      onUpdateMemberBudget(trip.id, activeUser.id, newAmount)
    }
    setIsEditBudgetOpen(false)
  }

  return (
    <div className="min-h-full bg-[#F4FBFA] p-4 md:p-8 max-w-7xl pb-28">
      {/* =========================
          HERO BANNER
      ========================= */}
      <div
        className="relative overflow-hidden rounded-[28px] mb-7 min-h-[250px] flex items-end shadow-md"
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(3,45,46,0.92), rgba(3,45,46,0.15)), url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=90')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute top-5 left-5 flex items-center gap-2 flex-wrap">
          <span className="bg-white/90 backdrop-blur-sm text-teal-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs">
            ✈️ ACTIVE TRIP · {trip.currency}
          </span>
          {trip.isGroupTrip && (
            <span className="bg-teal-600/90 text-white px-3 py-1.5 rounded-full text-xs font-bold">
              👥 {trip.adults || partyMembers.length} Adults{trip.children ? ` · ${trip.children} Children` : ''}
            </span>
          )}
          <span className="bg-emerald-500/90 text-white px-3 py-1.5 rounded-full text-xs font-bold">
            💰 Group Fund: {currencySymbol}{budget.toLocaleString()}
          </span>
        </div>

        <div className="relative p-6 md:p-8 text-white w-full">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-teal-200 text-xs font-semibold mb-1">
                {trip.destination} · {trip.startDate} – {trip.endDate}
              </p>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{trip.name}</h1>
              <p className="text-white/80 mt-1.5 text-xs md:text-sm">
                Make memories, track budgets, and travel smarter with AI.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => navigate('adaptive-itinerary')}
                className="px-4 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl font-bold text-sm transition shadow-lg flex items-center gap-2 border border-white/25"
              >
                <span>🗺️</span>
                Adaptive Itinerary
              </button>
              <button
                onClick={() => navigate('add-expense')}
                className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-xl font-bold text-sm transition shadow-lg flex items-center gap-2"
              >
                <span className="text-lg leading-none">+</span>
                Add Expense
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================
          TRIP TRAVELLERS & PARTY MEMBERS BAR (WITH MEMBER PERSONAL BUDGETS)
      ========================= */}
      <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-4 md:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">👥</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Trip Travellers & Party Members</h3>
                <span className="bg-teal-50 text-teal-800 border border-teal-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {trip.adults || partyMembers.length} Adults{trip.children ? ` · ${trip.children} Children` : ' · 0 Children'}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md">
                  Total: {(trip.adults || partyMembers.length) + (trip.children || 0)} Travellers
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Group split calculations apply to adults only · Each adult contributes an individual personal budget
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-bold px-2.5 py-1 rounded-lg">
              ✓ Accounts: Adults Only
            </span>
          </div>
        </div>

        {/* Dynamic Member Avatars & Personal Budget Cards */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3">
          {partyMembers.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border transition ${
                member.isMe
                  ? 'border-indigo-300 bg-indigo-50/70 shadow-2xs'
                  : 'border-slate-200 bg-slate-50 shadow-2xs'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-base shadow-xs">
                {member.avatar}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 leading-tight">
                    {member.name} {member.isMe ? '(You)' : ''}
                  </span>
                  {member.isMe && (
                    <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                  {member.isPending && (
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                      ⏳ Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[10px] font-bold ${member.isPending ? 'text-amber-700' : 'text-teal-700'}`}>
                    {member.isPending ? 'Contribution: ⏳ Pending' : `Budget: ${currencySymbol}${member.budget.toLocaleString()}`}
                  </span>
                  {member.isMe && (
                    <button
                      type="button"
                      onClick={openBudgetEditor}
                      className="text-[9px] text-indigo-700 hover:underline font-bold"
                    >
                      (Edit)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Children Pill (if any) */}
          {(trip.children || 0) > 0 && (
            <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 px-3 py-2 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-base">
                👧
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-950 block leading-tight">
                  {trip.children} {trip.children === 1 ? 'Child' : 'Children'}
                </span>
                <span className="text-[10px] text-indigo-600 font-medium">Info only · Not in accounts</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================
          DUAL-TIER QUICK STATS CARDS: GROUP BUDGET + MY PERSONAL BUDGET
      ========================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        {/* CARD 1: GROUP TRIP BUDGET */}
        <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Group Trip Budget</p>
            <span className="text-xl">👥</span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {currencySymbol}{budget.toLocaleString()}
          </p>
          <p className="text-[11px] text-teal-700 font-semibold mt-1">
            Sum of all {partyMembers.length} members' budgets
          </p>
        </div>

        {/* CARD 2: MY PERSONAL BUDGET */}
        <div className="bg-indigo-50/50 rounded-2xl border border-indigo-200 shadow-sm p-4 hover:shadow-md transition relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">My Personal Budget</p>
            <span className="text-xl">👤</span>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-indigo-900">
              {currencySymbol}{personalBudget.toLocaleString()}
            </p>
            <button
              type="button"
              onClick={openBudgetEditor}
              className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-lg hover:bg-indigo-700 transition"
            >
              Edit
            </button>
          </div>
          <p className="text-[11px] text-indigo-600 font-medium mt-1">
            {currencySymbol}{personalRemaining.toLocaleString()} remaining for you
          </p>
        </div>

        {/* CARD 3: GROUP SPENT TO DATE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Group Spent to Date</p>
            <span className="text-xl">🧾</span>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {currencySymbol}{spent.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {daysGone} of {daysTotal} days used ({pct}%)
          </p>
        </div>

        {/* CARD 4: MY PERSONAL SPEND */}
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-4 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">My Personal Spend</p>
            <span className="text-xl">💳</span>
          </div>
          <p className="text-2xl font-black text-emerald-800">
            {currencySymbol}{personalSpent.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {personalPct}% of your individual cap
          </p>
        </div>
      </div>

      {/* =========================
          BUDGET GAUGE & AI GUARDIAN SECTION
      ========================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* DUAL-TIER BUDGET CARD (GROUP VS PERSONAL VIEW TOGGLE) */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-6 flex flex-col items-center justify-center">
            {/* Toggle Switcher */}
            <div className="w-full flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{budgetViewMode === 'group' ? '👥' : '👤'}</span>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {budgetViewMode === 'group' ? 'Group Budget' : 'My Personal Budget'}
                </h3>
              </div>

              {/* Pill Toggle */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBudgetViewMode('group')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                    budgetViewMode === 'group'
                      ? 'bg-white text-teal-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Group
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetViewMode('personal')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                    budgetViewMode === 'personal'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Mine
                </button>
              </div>
            </div>

            <DonutChart
              pct={budgetViewMode === 'group' ? pct : personalPct}
              isPersonal={budgetViewMode === 'personal'}
            />

            <div className="text-center -mt-1 w-full">
              <p className="font-extrabold text-slate-900 text-lg">
                {currencySymbol}
                {(budgetViewMode === 'group' ? remaining : personalRemaining).toLocaleString()} left
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {budgetViewMode === 'group'
                  ? `Funded: ${currencySymbol}${budget.toLocaleString()} (${trip.currency})`
                  : `Your Personal Fund: ${currencySymbol}${personalBudget.toLocaleString()}`}
              </p>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs px-2">
                <span className="text-slate-500 font-medium">Safe Daily Runway:</span>
                <span className="font-bold text-teal-800">
                  {currencySymbol}
                  {(budgetViewMode === 'group' ? safeDaily : personalSafeDaily).toLocaleString()} / day
                </span>
              </div>
            </div>
          </div>

          {/* EXPENSES EXPANSION CARD BELOW TRAVEL BUDGET */}
          <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden transition-all">
            <button
              onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
              className="w-full p-4.5 flex items-center justify-between hover:bg-slate-50/80 transition text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">📊</span>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Category Spending Limits</h4>
                  <p className="text-[11px] text-slate-400">
                    {isExpensesExpanded ? 'Click to collapse caps' : 'Click to expand category breakdown'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                  {defaultCategories.length} Categories
                </span>
                <span className="text-slate-400 text-sm font-bold">
                  {isExpensesExpanded ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {/* EXPANDABLE BODY */}
            {isExpensesExpanded && (
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-3.5 animate-in fade-in duration-200">
                {defaultCategories.map((cat) => {
                  const catPct = Math.round((cat.amount / cat.cap) * 100)
                  return (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">{catIcons[cat.name]}</span>
                          <span className="font-semibold text-slate-800">{cat.name}</span>
                        </div>
                        <span className="text-slate-500">
                          <strong>₹{cat.amount.toLocaleString()}</strong> / ₹{cat.cap.toLocaleString()}
                          <span className="ml-1.5 text-[10px] text-slate-400">({catPct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${catPct > 80 ? 'bg-rose-500' : cat.color} transition-all`}
                          style={{ width: `${Math.min(catPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI TRAVEL GUARDIAN SECTION */}
        <div className="lg:col-span-2 rounded-3xl border border-amber-200/90 shadow-sm p-6 md:p-7 bg-gradient-to-br from-[#FFF9EC] via-[#FFFDF8] to-[#FFF3D6] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-amber-200 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-base">AI Travel Guardian</p>
                    <span className="px-2.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {trip.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Continuous financial health, itinerary intelligence & simulation
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/70 border border-amber-200 rounded-xl text-xs font-bold text-amber-900">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Active Protection</span>
              </div>
            </div>

            {/* Health Status & Runway Insight */}
            <div className="p-4 bg-white/90 rounded-2xl border border-amber-100 mb-4 shadow-2xs">
              <p className="text-xs md:text-sm text-slate-800 leading-relaxed">
                Group spending rate is <strong>{currencySymbol}{dailyAvg.toLocaleString()}/day</strong>. Your calculated safe daily limit is <strong>{currencySymbol}{safeDaily.toLocaleString()}/day</strong> across the remaining {daysLeft} days.
              </p>
              {projectedOver > 0 && (
                <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                  <span>⚠️ Pace Warning:</span> Continuing at this pace will exceed your trip budget by {currencySymbol}{projectedOver.toLocaleString()}.
                </p>
              )}
            </div>

            {/* Trip AI Statistics */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div className="bg-white/80 p-3 rounded-2xl border border-amber-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Group Spend</span>
                <span className="text-base font-extrabold text-slate-900">{currencySymbol}{trip.spent.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{pct}% of group fund</span>
              </div>

              <div className="bg-white/80 p-3 rounded-2xl border border-amber-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Safe Daily Limit</span>
                <span className="text-base font-extrabold text-teal-800">{currencySymbol}{safeDaily.toLocaleString()}</span>
                <span className="text-[10px] text-teal-600 font-medium block mt-0.5">{daysLeft} days left</span>
              </div>

              <div className="bg-white/80 p-3 rounded-2xl border border-amber-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Projected Total</span>
                <span className={`text-base font-extrabold ${projectedOver > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {currencySymbol}{projectedFinal.toLocaleString()}
                </span>
                <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                  {projectedOver > 0 ? `+${currencySymbol}${projectedOver.toLocaleString()} over` : 'On track'}
                </span>
              </div>
            </div>
          </div>

          {/* TRIPLE ACTION BUTTONS: 1) ASK GUARDIAN 2) WHAT-IF SIMULATION 3) ADAPTIVE ITINERARY */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <button
              onClick={() => navigate('ai-guardian')}
              className="group p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-base">
                  💬
                </div>
                <span className="text-[11px] font-bold bg-white/25 px-2 py-0.5 rounded-full group-hover:translate-x-0.5 transition-transform">
                  Chatbot →
                </span>
              </div>
              <div>
                <p className="font-bold text-sm">Ask AI Guardian</p>
                <p className="text-[11px] text-amber-100 mt-0.5">
                  Itinerary, monthly spend & budget runway
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('what-if')}
              className="group p-3.5 bg-white hover:bg-amber-50/70 border border-amber-200 text-slate-900 rounded-2xl shadow-2xs hover:shadow-sm transition text-left flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-base">
                  🔮
                </div>
                <span className="text-[11px] font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform">
                  Simulator →
                </span>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">What-If Simulator</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Test hypothetical purchases & runway
                </p>
              </div>
            </button>

            <button
              onClick={() => navigate('adaptive-itinerary')}
              className="group p-3.5 bg-gradient-to-br from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white rounded-2xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-base">
                  🗺️
                </div>
                <span className="text-[11px] font-bold bg-white/25 px-2 py-0.5 rounded-full group-hover:translate-x-0.5 transition-transform">
                  Adapt Plan →
                </span>
              </div>
              <div>
                <p className="font-bold text-sm">Adaptive Itinerary</p>
                <p className="text-[11px] text-teal-100 mt-0.5">
                  Re-plan on rain, delays & budget cuts
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* =========================
          VIEW EXPENSES & SETTLEMENT SHORTCUTS
      ========================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-7">
        {/* CARD FOR VIEWING EXPENSES FOR THAT TRIP */}
        <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-xl">
                  💳
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Trip Expenses Ledger</h3>
                  <p className="text-xs text-slate-400">All shared & personal spending for {trip.name}</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-teal-50 text-teal-700 px-3 py-1 rounded-full">
                {expenses.length} Records
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Track individual line items, separate group expenses from personal spends, and review multi-currency foreign exchange conversions.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <span className="text-[11px] text-slate-400 block font-medium">Shared Group Spend</span>
                <span className="text-sm font-bold text-slate-800">
                  {currencySymbol}{Math.round(spent * 0.86).toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <span className="text-[11px] text-slate-400 block font-medium">Your Personal Spend</span>
                <span className="text-sm font-bold text-indigo-700">
                  {currencySymbol}{personalSpent.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('expense-history')}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-sm"
          >
            <span>View All Expenses for This Trip</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* GROUP SETTLEMENT SHORTCUT CARD */}
        <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">
                  💸
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Group Balances</h3>
                  <p className="text-xs text-slate-400">Person-wise who owes whom</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                {partyMembers.length} Travellers
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Splits computed using largest remainder allocation. Settle up seamlessly with verified 1-click payment confirmations.
            </p>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-emerald-800">Net Status for You</p>
                <p className="text-[11px] text-emerald-600">Asha and Ravi owe you money</p>
              </div>
              <span className="text-base font-extrabold text-emerald-700">+₹2,000</span>
            </div>
          </div>

          <button
            onClick={() => navigate('group-settlement')}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-sm"
          >
            <span>Open Person-Wise Settlement</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* =========================
          TRIP MEMORIES PHOTO GALLERY
      ========================= */}
      <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-lg">Trip Memories</h3>
              <span className="text-xl">📸</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Your journey captured in moments.</p>
          </div>

          <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition shadow-sm">
            <span className="text-base">+</span>
            Add Photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {memories.map((photo, index) => (
            <div
              key={index}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100"
            >
              <img
                src={photo}
                alt={`Trip memory ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-3">
                <p className="text-white text-xs font-bold truncate">{trip.destination}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================
          EDIT PERSONAL BUDGET MODAL (INVITED MEMBER OR ORGANIZER)
      ========================= */}
      {isEditBudgetOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-indigo-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Update My Personal Budget
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Trip: {trip.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBudgetOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When you adjust your personal budget allocation, the <strong>total group budget fund</strong> automatically recalculates as the sum of all members' contributions.
            </p>

            <form onSubmit={handleSavePersonalBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Your Personal Budget ({trip.currency})
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
                  <span className="text-sm font-bold text-slate-400 mr-2">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editedBudgetInput}
                    onChange={(e) => setEditedBudgetInput(e.target.value)}
                    required
                    className="w-full bg-transparent text-lg font-black text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50 rounded-xl text-[11px] text-indigo-900 border border-indigo-100">
                <strong>Current Group Budget:</strong> {currencySymbol}{budget.toLocaleString()}
                <br />
                <strong>New Group Budget:</strong> {currencySymbol}
                {(
                  budget -
                  personalBudget +
                  (parseFloat(editedBudgetInput) || 0)
                ).toLocaleString()}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  Save & Update Group Budget
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditBudgetOpen(false)}
                  className="px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}