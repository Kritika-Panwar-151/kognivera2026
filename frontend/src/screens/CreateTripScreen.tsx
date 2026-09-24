import { useState, useMemo, useEffect } from 'react'
import type { NavigateFn, Trip, User } from '../types'
import {
  CANONICAL_COUNTRIES,
  CANONICAL_CITIES,
  getCurrencyForCountry,
} from '../data/canonicalReferences'
import {
  getRegisteredUsers,
  subscribeToLiveUsers,
  fetchUsersFromSupabase,
} from '../services/userRegistry'

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
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<User[]>(getRegisteredUsers())

  // Realtime multi-device subscription: updates automatically when anyone registers anywhere
  useEffect(() => {
    const unsubscribe = subscribeToLiveUsers((users) => {
      setAllRegisteredUsers(users)
    })
    return () => unsubscribe()
  }, [])

  const [selectedMembers, setSelectedMembers] = useState<User[]>([hostUser])
  const [hostPersonalBudget, setHostPersonalBudget] = useState<number>(35000)

  // Dynamic search results across all live registered users
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const available = allRegisteredUsers.filter((u) => !selectedMembers.some((m) => m.id === u.id))
    if (!q) {
      // If search box is focused, show live registered users as immediate suggestions
      return isSearchFocused ? available.slice(0, 8) : []
    }
    return available.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.homeCountry && u.homeCountry.toLowerCase().includes(q)) ||
        (u.homeCity && u.homeCity.toLowerCase().includes(q))
    )
  }, [searchQuery, selectedMembers, allRegisteredUsers, isSearchFocused])

  // Invited friends (excluding the host)
  const invitedMembers = useMemo(
    () => selectedMembers.filter((m) => m.id !== hostUser.id),
    [selectedMembers, hostUser.id]
  )

  // Total Group Budget initially equals the Host's personal budget
  // (Friends will add their own personal balance when accepting the invite)
  const totalGroupBudget = hostPersonalBudget

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
      setSearchQuery('')
    }
  }

  const handleRemoveMember = (userId: string) => {
    if (userId === hostUser.id) return // Host cannot be removed
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId))
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
      budget: hostPersonalBudget,
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
      memberBudgets: {
        [hostUser.id]: hostPersonalBudget,
      },
      personalBudget: hostPersonalBudget,
      categoryCaps: {
        accommodation: Math.round(hostPersonalBudget * 0.35),
        food: Math.round(hostPersonalBudget * 0.25),
        transport: Math.round(hostPersonalBudget * 0.20),
        activities: Math.round(hostPersonalBudget * 0.10),
        misc: Math.round(hostPersonalBudget * 0.10),
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

            {/* Human-Readable Date Confirmation Badge */}
            {startDate && endDate && (
              <div className="py-2 px-3 bg-teal-50 border border-teal-200/60 rounded-xl flex items-center justify-between text-xs text-teal-900 font-medium">
                <span>
                  📅 <strong>{new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  {' → '}
                  <strong>{new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                </span>
                <span className="text-[10px] bg-teal-200/60 text-teal-900 px-2 py-0.5 rounded font-bold">
                  {Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))} Days Trip
                </span>
              </div>
            )}
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                🔍 Search & Invite Friends to Trip
              </label>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Network Sync
              </span>
            </div>
            <div className="relative mb-2">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  setIsSearchFocused(true)
                  fetchUsersFromSupabase()
                }}
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
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {searchQuery ? 'Matching People' : '⚡ Registered Travelers Across Devices'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSearchFocused(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Close
                  </button>
                </div>
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

        {/* ================= SECTION 3: PERSONAL BUDGET & INVITED FRIENDS ================= */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Your Personal Budget & Invited Members
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Enter your personal budget limit. Invited friends will enter their own personal budget when they join.
              </p>
            </div>
            <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Initial Group Fund: {autoCurrency} {totalGroupBudget.toLocaleString()}
            </span>
          </div>

          {/* 1. Host Personal Budget Input Card */}
          <div className="bg-slate-50/90 rounded-2xl border border-teal-200/80 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl shadow-xs">
                  {hostUser.avatar || '👤'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">{hostUser.name}</span>
                    <span className="text-[9px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                      Host (You)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Your personal budget contribution for this trip</p>
                </div>
              </div>

              {/* Personal Budget Input for Host */}
              <div className="flex items-center bg-white border-2 border-teal-600/40 rounded-xl px-3 py-2 shadow-2xs focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100 self-start sm:self-auto">
                <span className="text-xs font-bold text-teal-700 mr-2">{autoCurrency}</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={hostPersonalBudget}
                  onChange={(e) => setHostPersonalBudget(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-32 text-sm font-black text-slate-900 outline-none text-right"
                  required
                />
              </div>
            </div>

            {/* Quick Presets for Host */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
              {[15000, 25000, 35000, 50000, 75000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHostPersonalBudget(preset)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    hostPersonalBudget === preset
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  {autoCurrency} {(preset / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* 2. Invited Friends (Awaiting Acceptance) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Invited Friends ({invitedMembers.length})
              </span>
              <span className="text-[10px] text-slate-400">
                Personal budgets will be set individually by each friend upon joining
              </span>
            </div>

            {invitedMembers.length === 0 ? (
              <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 text-center text-xs text-slate-500">
                No friends invited yet. Use the search bar in Section 2 above to search and invite friends live across devices.
              </div>
            ) : (
              <div className="space-y-2">
                {invitedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                        {member.avatar || '👤'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{member.name}</span>
                          <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            ⏳ Pending Invite
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        Will set own balance on join
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="w-7 h-7 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center text-xs font-bold transition"
                        title="Cancel Invite"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. DYNAMIC GROUP BUDGET SUMMATION BANNER */}
          <div className="bg-linear-to-r from-teal-700 to-[#123B3A] text-white rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-teal-200 font-bold block">
                  Collective Trip Fund
                </span>
                <span className="text-2xl font-black">
                  {autoCurrency} {totalGroupBudget.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-teal-600/80 px-2 py-0.5 rounded-full font-bold">
                  1 Active Member {invitedMembers.length > 0 ? `· ${invitedMembers.length} Pending` : ''}
                </span>
                <p className="text-[10px] text-teal-200 mt-1">
                  Host: {autoCurrency} {hostPersonalBudget.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Dynamic Formula Display */}
            <div className="pt-2 border-t border-teal-600/60 text-[11px] text-teal-100/90 space-y-0.5">
              <p className="font-mono">
                Formula: Σ (Active Member Budgets) = Group Budget
              </p>
              <p className="text-[10px] text-teal-200/80">
                ✨ Group budget automatically expands as invited friends accept on their devices and contribute their personal balances.
              </p>
            </div>
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
