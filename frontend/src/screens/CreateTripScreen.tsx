import { useState, useMemo } from 'react'
import type { NavigateFn, Trip, User } from '../types'
import {
  CANONICAL_COUNTRIES,
  CANONICAL_CITIES,
  getCurrencyForCountry,
} from '../data/canonicalReferences'
import { searchUsers, getRegisteredUsers } from '../services/userRegistry'

interface Props {
  navigate: NavigateFn
  currentUser?: User
  onCreated: (trip: Trip) => void
}

export default function CreateTripScreen({ navigate, currentUser, onCreated }: Props) {
  // Current host user
  const hostUser = currentUser || {
    id: 'usr_you',
    name: 'You (Aisha)',
    email: 'aisha.rossi@example.invalid',
    homeCurrency: 'INR',
    avatar: '👩🏽',
    role: 'Owner',
  }

  // 1. Trip Basic Info
  const [name, setName] = useState('Switzerland Expedition')
  const [originCountry, setOriginCountry] = useState('India')
  const [originCity, setOriginCity] = useState('Bengaluru')
  const [destinationCountry, setDestinationCountry] = useState('Switzerland')
  const [destinationCity, setDestinationCity] = useState('Zurich')
  const [startDate, setStartDate] = useState('2026-10-15')
  const [endDate, setEndDate] = useState('2026-10-22')

  // Auto-derived currency from Origin/Home Country
  const autoCurrency = useMemo(() => getCurrencyForCountry(originCountry), [originCountry])

  // 2. Travellers & Members
  const [adults, setAdults] = useState('3')
  const [children, setChildren] = useState('0')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<User[]>([
    hostUser,
    ...getRegisteredUsers().filter((u) => u.id === 'usr_ravi' || u.id === 'usr_asha').slice(0, 2),
  ])

  // 3. Member-specific personal budgets (Host + each invited member)
  const [memberBudgets, setMemberBudgets] = useState<Record<string, number>>({
    [hostUser.id]: 35000,
    usr_ravi: 35000,
    usr_asha: 30000,
  })

  // Dynamic search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const results = searchUsers(searchQuery)
    // Filter out already selected members
    return results.filter((u) => !selectedMembers.some((m) => m.id === u.id))
  }, [searchQuery, selectedMembers])

  // Total Group Budget is the exact sum of all members' individual personal budgets
  const totalGroupBudget = useMemo(() => {
    return selectedMembers.reduce((sum, member) => {
      const b = memberBudgets[member.id] || 0
      return sum + b
    }, 0)
  }, [selectedMembers, memberBudgets])

  const totalParty = (parseInt(adults) || 1) + (parseInt(children) || 0)

  const handleOriginCountryChange = (cName: string) => {
    setOriginCountry(cName)
    const country = CANONICAL_COUNTRIES.find((c) => c.name === cName)
    if (country) {
      const city = CANONICAL_CITIES.find((ct) => ct.countryId === country.id)
      if (city) setOriginCity(city.name)
    }
  }

  const handleDestinationCountryChange = (cName: string) => {
    setDestinationCountry(cName)
    const country = CANONICAL_COUNTRIES.find((c) => c.name === cName)
    if (country) {
      const city = CANONICAL_CITIES.find((ct) => ct.countryId === country.id)
      if (city) setDestinationCity(city.name)
    }
  }

  const handleAddMember = (user: User) => {
    if (!selectedMembers.some((m) => m.id === user.id)) {
      setSelectedMembers((prev) => [...prev, user])
      setMemberBudgets((prev) => ({
        ...prev,
        [user.id]: prev[user.id] || 25000, // default budget for newly invited member
      }))
      setSearchQuery('')
    }
  }

  const handleRemoveMember = (userId: string) => {
    if (userId === hostUser.id) return // Host cannot be removed
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId))
    setMemberBudgets((prev) => {
      const copy = { ...prev }
      delete copy[userId]
      return copy
    })
  }

  const handleBudgetChange = (userId: string, amount: number) => {
    setMemberBudgets((prev) => ({
      ...prev,
      [userId]: Math.max(0, amount),
    }))
  }

  const handleCreate = () => {
    const destinationString = `${destinationCity}, ${destinationCountry}`
    const originString = `${originCity}, ${originCountry}`

    const newTrip: Trip = {
      id: `trp_${Date.now().toString(36)}`,
      name: name.trim() || 'My Group Trip',
      destination: destinationString,
      startDate,
      endDate,
      currency: autoCurrency,
      budget: totalGroupBudget,
      spent: 0,
      ownerId: hostUser.id,
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      partySize: totalParty,
      members: selectedMembers.map((m) => m.id),
      isGroupTrip: selectedMembers.length > 1,
      originCountry,
      originCity: originString,
      destinationCountry,
      destinationCity,
      memberBudgets,
      personalBudget: memberBudgets[hostUser.id] || 0,
      categoryCaps: {
        accommodation: Math.round(totalGroupBudget * 0.35),
        food: Math.round(totalGroupBudget * 0.25),
        transport: Math.round(totalGroupBudget * 0.20),
        activities: Math.round(totalGroupBudget * 0.10),
        misc: Math.round(totalGroupBudget * 0.10),
      },
    }

    onCreated(newTrip)
    navigate('trip-dashboard')
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-28">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate('trip-dashboard')}
        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-5 transition"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Dashboard
      </button>

      {/* Screen Title */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
          <span>✨ Trip Planner</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Create New Trip & Budget</h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">
          Invite members, define personal budgets, and automatically calculate your total group budget fund.
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-teal-100 p-5 md:p-8 space-y-6">
        {/* ================= SECTION 1: TRIP DETAILS ================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Trip Details & Geographic Anchor
            </h2>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Currency: {autoCurrency} (Auto-Set)
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Trip Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Switzerland Expedition"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Home/Origin Country & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Home Country (Origin)
                </label>
                <select
                  value={originCountry}
                  onChange={(e) => handleOriginCountryChange(e.target.value)}
                  className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:border-teal-500 outline-none"
                >
                  {CANONICAL_COUNTRIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.defaultCurrency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Origin City
                </label>
                <input
                  type="text"
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Destination Country & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-teal-50/40 rounded-2xl border border-teal-100">
              <div>
                <label className="block text-xs font-bold text-teal-900 mb-1">
                  Trip Destination Country
                </label>
                <select
                  value={destinationCountry}
                  onChange={(e) => handleDestinationCountryChange(e.target.value)}
                  className="w-full border border-teal-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:border-teal-500 outline-none"
                >
                  {CANONICAL_COUNTRIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-teal-900 mb-1">
                  Destination City
                </label>
                <input
                  type="text"
                  value={destinationCity}
                  onChange={(e) => setDestinationCity(e.target.value)}
                  placeholder="e.g. Zurich"
                  className="w-full border border-teal-200 bg-white rounded-xl px-3 py-2 text-xs font-medium focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-teal-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECTION 2: TRAVELLERS & INVITE PEOPLE ================= */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Travellers Breakdown & Party
            </h2>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
              {totalParty} Total Travellers
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Adults (18+ · Group Split)
              </label>
              <input
                type="number"
                min="1"
                value={adults}
                onChange={(e) => setAdults(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Children (Info-only)
              </label>
              <input
                type="number"
                min="0"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          {/* Search & Invite People */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              🔍 Search & Invite Friends to Trip
            </label>
            <div className="relative mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or country (e.g. Ravi, Elena, Pooja)..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="bg-white border border-teal-200 rounded-2xl shadow-lg p-2 mb-3 max-h-48 overflow-y-auto space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Matching People
                </p>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-teal-50/70 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{user.avatar || '👤'}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{user.name}</p>
                        <p className="text-[10px] text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddMember(user)}
                      className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition"
                    >
                      + Invite
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= SECTION 3: PERSONAL BUDGETS & TOTAL GROUP BUDGET ================= */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Member Personal Budgets & Group Fund
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Set each person's personal budget. The total group budget is the sum of all members.
              </p>
            </div>
            <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Total: {autoCurrency} {totalGroupBudget.toLocaleString()}
            </span>
          </div>

          {/* Member Budget Input List */}
          <div className="space-y-3">
            {selectedMembers.map((member) => {
              const isHost = member.id === hostUser.id
              const currentBudget = memberBudgets[member.id] || 0

              return (
                <div
                  key={member.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-xs">
                      {member.avatar || '👤'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{member.name}</span>
                        {isHost ? (
                          <span className="text-[9px] font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                            Host (You)
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                            Invited Member
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">{member.email}</span>
                    </div>
                  </div>

                  {/* Personal Budget Input for this user */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-200">
                      <span className="text-xs font-bold text-slate-400 mr-1.5">{autoCurrency}</span>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={currentBudget}
                        onChange={(e) => handleBudgetChange(member.id, parseFloat(e.target.value) || 0)}
                        className="w-28 text-sm font-extrabold text-slate-900 outline-none text-right"
                      />
                    </div>

                    {!isHost && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="w-8 h-8 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center text-xs font-bold transition"
                        title="Remove Member"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* DYNAMIC GROUP BUDGET SUMMATION BANNER */}
          <div className="bg-linear-to-r from-teal-700 to-[#123B3A] text-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-teal-200 font-bold block">
                  Calculated Collective Trip Fund
                </span>
                <span className="text-2xl font-black">
                  {autoCurrency} {totalGroupBudget.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-teal-600/80 px-2 py-0.5 rounded-full font-bold">
                  {selectedMembers.length} Contributing Members
                </span>
                <p className="text-[10px] text-teal-200 mt-1">
                  Avg: {autoCurrency} {Math.round(totalGroupBudget / Math.max(selectedMembers.length, 1)).toLocaleString()} / person
                </p>
              </div>
            </div>

            {/* Formula display */}
            <p className="text-[11px] text-teal-100/90 pt-1 border-t border-teal-600/60 font-mono">
              Formula: Σ (Member Personal Budgets) = Group Budget
            </p>
          </div>

          {/* Category Caps Breakdown Preview */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Automatic Category Caps (PS-08 Standard)</span>
              <span className="text-teal-700">{autoCurrency} {totalGroupBudget.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">🏨 Stay (35%)</span>
                <strong className="text-slate-800">{autoCurrency} {Math.round(totalGroupBudget * 0.35).toLocaleString()}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">🍽️ Food (25%)</span>
                <strong className="text-slate-800">{autoCurrency} {Math.round(totalGroupBudget * 0.25).toLocaleString()}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">🚗 Transit (20%)</span>
                <strong className="text-slate-800">{autoCurrency} {Math.round(totalGroupBudget * 0.20).toLocaleString()}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">⭐ Activity (10%)</span>
                <strong className="text-slate-800">{autoCurrency} {Math.round(totalGroupBudget * 0.10).toLocaleString()}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">📦 Misc (10%)</span>
                <strong className="text-slate-800">{autoCurrency} {Math.round(totalGroupBudget * 0.10).toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleCreate}
            className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-md transition text-sm flex items-center justify-center gap-2"
          >
            <span>🚀</span>
            <span>Create Trip & Confirm Budget</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('trip-dashboard')}
            className="px-6 py-3.5 border border-slate-200 text-slate-700 font-semibold rounded-2xl hover:bg-slate-50 transition text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
