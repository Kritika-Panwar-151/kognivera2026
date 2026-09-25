import { useState, useMemo, useEffect } from 'react'
import type { NavigateFn, Trip, User } from '../types'
import {
  CANONICAL_COUNTRIES,
  CANONICAL_CITIES,
  getCitiesForCountry,
  getCurrencyForCountry,
  calculateMinimumTripBudgetParams,
} from '../data/canonicalReferences'
import {
  getRegisteredUsers,
  subscribeToLiveUsers,
  fetchUsersFromSupabase,
} from '../services/userRegistry'
import { getCurrencySymbol, convertCurrency } from '../services/currencyService'

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

  // 1. Trip Basic Info (Auto-filled from user's account profile)
  const [name, setName] = useState('')
  const [originCountry, setOriginCountry] = useState(currentUser?.homeCountry || 'India')
  const [originCity, setOriginCity] = useState(currentUser?.homeCity || 'Bengaluru')
  const [destinationCountry, setDestinationCountry] = useState('Switzerland')
  const [destinationCity, setDestinationCity] = useState('Zurich')

  // Custom city input flags
  const [isCustomOriginCity, setIsCustomOriginCity] = useState(false)
  const [customOriginInput, setCustomOriginInput] = useState('')
  const [isCustomDestinationCity, setIsCustomDestinationCity] = useState(false)
  const [customDestinationInput, setCustomDestinationInput] = useState('')

  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date()
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays)
    }
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [startDate, setStartDate] = useState(getLocalDateString(0))
  const [endDate, setEndDate] = useState(getLocalDateString(7))

  // Sync with current user profile whenever loaded
  useEffect(() => {
    if (currentUser?.homeCountry) {
      setOriginCountry(currentUser.homeCountry)
    }
    if (currentUser?.homeCity) {
      setOriginCity(currentUser.homeCity)
    }
  }, [currentUser])

  // Available cities per country
  const availableOriginCities = useMemo(() => getCitiesForCountry(originCountry), [originCountry])
  const availableDestinationCities = useMemo(() => getCitiesForCountry(destinationCountry), [destinationCountry])

  // Auto-derived currency from Destination Country
  const autoCurrency = useMemo(() => getCurrencyForCountry(destinationCountry), [destinationCountry])

  // 2. Travellers & Members
  const [adults, setAdults] = useState('1')
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

  // 3b. Category Budget Percentage Allocations (Custom Entering)
  const [categoryPcts, setCategoryPcts] = useState({
    accommodation: 35,
    food: 25,
    transport: 20,
    activities: 10,
    misc: 10,
  })

  // Category Configuration Array
  const categoryConfig: Array<{
    key: keyof typeof categoryPcts
    label: string
    icon: string
    color: string
    bgLight: string
  }> = [
    { key: 'accommodation', label: 'Accommodation', icon: '🏨', color: 'bg-indigo-500', bgLight: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
    { key: 'food', label: 'Food & Dining', icon: '🍽️', color: 'bg-amber-500', bgLight: 'bg-amber-50 text-amber-900 border-amber-200' },
    { key: 'transport', label: 'Transport & Transit', icon: '🚗', color: 'bg-blue-500', bgLight: 'bg-blue-50 text-blue-900 border-blue-200' },
    { key: 'activities', label: 'Activities & Sightseeing', icon: '⭐', color: 'bg-purple-500', bgLight: 'bg-purple-50 text-purple-900 border-purple-200' },
    { key: 'misc', label: 'Shopping & Misc', icon: '🛍️', color: 'bg-emerald-500', bgLight: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  ]

  const totalPctAllocated = useMemo(() => {
    return (
      (Number(categoryPcts.accommodation) || 0) +
      (Number(categoryPcts.food) || 0) +
      (Number(categoryPcts.transport) || 0) +
      (Number(categoryPcts.activities) || 0) +
      (Number(categoryPcts.misc) || 0)
    )
  }, [categoryPcts])

  const handlePctChange = (key: keyof typeof categoryPcts, val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val || 0)))
    setCategoryPcts((prev) => ({
      ...prev,
      [key]: clamped,
    }))
  }

  const handleAmountChange = (key: keyof typeof categoryPcts, amountVal: number, totalBudget: number) => {
    if (totalBudget <= 0) return
    const pct = Math.max(0, Math.min(100, Math.round((amountVal / totalBudget) * 100)))
    setCategoryPcts((prev) => ({
      ...prev,
      [key]: pct,
    }))
  }

  const handleResetCategoryDefaults = () => {
    setCategoryPcts({
      accommodation: 35,
      food: 25,
      transport: 20,
      activities: 10,
      misc: 10,
    })
  }

  const handleAutoBalanceCategories = () => {
    if (totalPctAllocated === 0) {
      handleResetCategoryDefaults()
      return
    }
    const ratio = 100 / totalPctAllocated
    const rawAcc = Math.round(categoryPcts.accommodation * ratio)
    const rawFood = Math.round(categoryPcts.food * ratio)
    const rawTrans = Math.round(categoryPcts.transport * ratio)
    const rawAct = Math.round(categoryPcts.activities * ratio)
    const rawMisc = 100 - (rawAcc + rawFood + rawTrans + rawAct)

    setCategoryPcts({
      accommodation: rawAcc,
      food: rawFood,
      transport: rawTrans,
      activities: rawAct,
      misc: Math.max(0, rawMisc),
    })
  }

  // Calculate Distance-Based Minimum Budget
  const hostHomeCurr = (hostUser.homeCurrency || 'INR').toUpperCase()
  const hostHomeSymbol = getCurrencySymbol(hostHomeCurr)

  const effectiveOriginCity = isCustomOriginCity ? customOriginInput || originCity : originCity
  const effectiveDestinationCity = isCustomDestinationCity ? customDestinationInput || destinationCity : destinationCity

  const minBudgetCalc = useMemo(() => {
    const res = calculateMinimumTripBudgetParams({
      originCity: effectiveOriginCity,
      originCountry,
      destinationCity: effectiveDestinationCity,
      destinationCountry,
      startDate,
      endDate,
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
    })

    const minInHost = convertCurrency(res.minAmountINR, 'INR', hostHomeCurr)
    const roundedMin = Math.ceil(minInHost / 100) * 100 || Math.ceil(minInHost)

    return {
      ...res,
      minInHostCurr: roundedMin,
      isBelowMin: hostPersonalBudget < roundedMin,
    }
  }, [
    effectiveOriginCity,
    originCountry,
    effectiveDestinationCity,
    destinationCountry,
    startDate,
    endDate,
    adults,
    children,
    hostPersonalBudget,
    hostHomeCurr,
  ])

  // Dynamic search results across all live registered users
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const available = allRegisteredUsers.filter((u) => !selectedMembers.some((m) => m.id === u.id))
    if (!q) {
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

  const totalGroupBudget = hostPersonalBudget
  const totalParty = (parseInt(adults) || 1) + (parseInt(children) || 0)

  const handleOriginCountryChange = (cName: string) => {
    setOriginCountry(cName)
    const cities = getCitiesForCountry(cName)
    if (cities.length > 0) {
      setOriginCity(cities[0].name)
      setIsCustomOriginCity(false)
    } else {
      setIsCustomOriginCity(true)
      setCustomOriginInput('')
    }
  }

  const handleDestinationCountryChange = (cName: string) => {
    setDestinationCountry(cName)
    const cities = getCitiesForCountry(cName)
    if (cities.length > 0) {
      setDestinationCity(cities[0].name)
      setIsCustomDestinationCity(false)
    } else {
      setIsCustomDestinationCity(true)
      setCustomDestinationInput('')
    }
  }

  const handleAddMember = (user: User) => {
    if (!selectedMembers.some((m) => m.id === user.id)) {
      setSelectedMembers((prev) => [...prev, user])
      setSearchQuery('')
    }
  }

  const handleCreate = () => {
    // Check if entered budget is below distance-based minimum
    let finalBudget = hostPersonalBudget
    if (minBudgetCalc.isBelowMin) {
      finalBudget = minBudgetCalc.minInHostCurr
      setHostPersonalBudget(minBudgetCalc.minInHostCurr)
    }

    const finalMembers = [...selectedMembers]
    const finalDestCity = isCustomDestinationCity ? customDestinationInput.trim() || 'Destination' : destinationCity
    const finalOrigCity = isCustomOriginCity ? customOriginInput.trim() || 'Origin' : originCity

    const destinationString = `${finalDestCity}, ${destinationCountry}`
    const originString = `${finalOrigCity}, ${originCountry}`

    const calculatedCaps = {
      accommodation: Math.round(finalBudget * ((categoryPcts.accommodation || 0) / 100)),
      food: Math.round(finalBudget * ((categoryPcts.food || 0) / 100)),
      transport: Math.round(finalBudget * ((categoryPcts.transport || 0) / 100)),
      activities: Math.round(finalBudget * ((categoryPcts.activities || 0) / 100)),
      misc: Math.round(finalBudget * ((categoryPcts.misc || 0) / 100)),
    }

    const newTrip: Trip = {
      id: `trp_${Date.now().toString(36)}`,
      name: name.trim() || `${finalDestCity} Trip`,
      destination: destinationString,
      startDate,
      endDate,
      currency: autoCurrency,
      budget: finalBudget,
      spent: 0,
      ownerId: hostUser.id,
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      partySize: totalParty,
      members: finalMembers.map((m) => m.id),
      isGroupTrip: finalMembers.length > 1,
      originCountry,
      originCity: originString,
      destinationCountry,
      destinationCity: finalDestCity,
      memberBudgets: {
        [hostUser.id]: finalBudget,
      },
      personalBudget: finalBudget,
      memberDetails: finalMembers.map((m) => ({
        userId: m.id,
        role: m.id === hostUser.id ? 'owner' : 'editor',
        status: m.id === hostUser.id ? 'active' : 'pending',
        personalBudget: m.id === hostUser.id ? finalBudget : 0,
        categoryCaps: m.id === hostUser.id ? calculatedCaps : {},
      })),
      categoryCaps: calculatedCaps,
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
          Select destination cities, set personal budgets with smart distance validation, and invite travel members.
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
                placeholder={`e.g. ${effectiveDestinationCity || 'Switzerland'} Expedition`}
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
                {!isCustomOriginCity ? (
                  <select
                    value={originCity}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomOriginCity(true)
                      } else {
                        setOriginCity(e.target.value)
                      }
                    }}
                    className="w-full border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-500 outline-none"
                  >
                    {availableOriginCities.map((ct) => (
                      <option key={ct.id} value={ct.name}>
                        📍 {ct.name}
                      </option>
                    ))}
                    <option value="__custom__">➕ Custom / Other City...</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={customOriginInput}
                      onChange={(e) => setCustomOriginInput(e.target.value)}
                      placeholder="Type custom origin city..."
                      className="w-full border border-teal-300 bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-500 outline-none pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomOriginCity(false)}
                      className="absolute right-2 top-2 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold"
                      title="Switch back to dropdown"
                    >
                      Dropdown
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Destination Country & City Dropdown */}
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
                  Destination City ({destinationCountry})
                </label>
                {!isCustomDestinationCity ? (
                  <select
                    value={destinationCity}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomDestinationCity(true)
                      } else {
                        setDestinationCity(e.target.value)
                      }
                    }}
                    className="w-full border border-teal-200 bg-white rounded-xl px-3 py-2 text-xs font-bold text-teal-950 focus:border-teal-500 outline-none shadow-2xs"
                  >
                    {availableDestinationCities.map((ct) => (
                      <option key={ct.id} value={ct.name}>
                        🏙️ {ct.name}
                      </option>
                    ))}
                    <option value="__custom__">➕ Custom / Other City...</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={customDestinationInput}
                      onChange={(e) => setCustomDestinationInput(e.target.value)}
                      placeholder="Type custom destination city..."
                      className="w-full border border-teal-300 bg-white rounded-xl px-3 py-2 text-xs font-bold text-teal-950 focus:border-teal-500 outline-none pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomDestinationCity(false)}
                      className="absolute right-2 top-2 text-[10px] bg-teal-100 hover:bg-teal-200 text-teal-800 px-1.5 py-0.5 rounded font-bold"
                    >
                      Select List
                    </button>
                  </div>
                )}
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

            {/* Human-Readable Date & Distance Confirmation Badge */}
            {startDate && endDate && (
              <div className="py-2.5 px-3 bg-teal-50 border border-teal-200/60 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-teal-900 font-medium">
                <span>
                  📅 <strong>{new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  {' → '}
                  <strong>{new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-teal-200/60 text-teal-900 px-2 py-0.5 rounded font-bold">
                    {minBudgetCalc.days} Days Trip
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                    🗺️ ~{minBudgetCalc.distanceKm} km
                  </span>
                </div>
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

            {/* Party Overview Status */}
            <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">👥</span>
                <span className="text-slate-700 font-medium">
                  Party: <strong>{totalParty} traveller{totalParty > 1 ? 's' : ''}</strong> ({selectedMembers.length} on app · {invitedMembers.length} invited)
                </span>
              </div>
              <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2.5 py-0.5 rounded-full">
                {invitedMembers.length > 0 ? `${invitedMembers.length} Friend${invitedMembers.length > 1 ? 's' : ''} Invited` : 'Host Only'}
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

        {/* ================= SECTION 3: PERSONAL BUDGET & DISTANCE VALIDATION ================= */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Your Personal Budget & Distance Validation
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Set budget limit. System validates minimum budget required based on geographic distance.
              </p>
            </div>
            <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Initial Group Fund: {autoCurrency} {totalGroupBudget.toLocaleString()}
            </span>
          </div>

          {/* Distance & Recommended Budget Indicator */}
          <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-teal-900 font-medium">
              <span>✈️ Travel Route:</span>
              <strong className="text-teal-950 font-bold">{effectiveOriginCity} → {effectiveDestinationCity}</strong>
              <span className="text-[10px] bg-teal-200/70 text-teal-900 font-bold px-2 py-0.5 rounded-full">
                ~{minBudgetCalc.distanceKm} km ({minBudgetCalc.isDomestic ? 'Domestic' : 'International'})
              </span>
            </div>
            <div className="text-teal-900 font-medium">
              <span>Required Min Budget:</span>
              <strong className="ml-1 text-teal-950 font-black text-sm">{hostHomeSymbol}{minBudgetCalc.minInHostCurr.toLocaleString()} {hostHomeCurr}</strong>
            </div>
          </div>

          {/* Budget Alert Warning if Below Minimum */}
          {minBudgetCalc.isBelowMin && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                    Budget Warning: Below Distance-Based Travel Minimum
                  </h4>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
                    Entered budget of <strong>{hostHomeSymbol}{hostPersonalBudget.toLocaleString()} {hostHomeCurr}</strong> is insufficient for traveling from <strong>{effectiveOriginCity}</strong> to <strong>{effectiveDestinationCity}</strong> (~{minBudgetCalc.distanceKm} km, {minBudgetCalc.days} day(s), {minBudgetCalc.totalParty} traveler(s)).
                  </p>
                </div>
              </div>

              {/* Itemized Cost Breakdown Table */}
              <div className="bg-white/90 rounded-xl p-3 border border-amber-200 space-y-1.5 text-xs">
                <p className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>📊 Itemized Non-Negotiable Travel Cost Breakdown</span>
                  <span className="text-amber-700">INR Base → Converted to {hostHomeCurr}</span>
                </p>

                {minBudgetCalc.breakdown.map((item, idx) => {
                  const itemInHost = convertCurrency(item.amountINR, 'INR', hostHomeCurr)
                  const roundedItem = Math.ceil(itemInHost / 10) * 10 || Math.ceil(itemInHost)

                  return (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0 text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{item.icon}</span>
                        <div>
                          <p className="font-bold text-slate-800 text-xs">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.note}</p>
                        </div>
                      </div>
                      <span className="font-black text-slate-900 text-xs">
                        {hostHomeSymbol}{roundedItem.toLocaleString()} {hostHomeCurr}
                      </span>
                    </div>
                  )
                })}

                <div className="pt-2 border-t border-amber-300 flex items-center justify-between text-xs font-black text-amber-950">
                  <span>Required Minimum Total Budget</span>
                  <span className="text-sm text-amber-700">{hostHomeSymbol}{minBudgetCalc.minInHostCurr.toLocaleString()} {hostHomeCurr}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHostPersonalBudget(minBudgetCalc.minInHostCurr)}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚡ Auto-Set Budget to Minimum Recommended ({hostHomeSymbol}{minBudgetCalc.minInHostCurr.toLocaleString()} {hostHomeCurr})</span>
              </button>
            </div>
          )}

          {/* Host Personal Budget Input Card */}
          {(() => {
            const destSymbol = getCurrencySymbol(autoCurrency)
            const convertedDestEquiv = convertCurrency(hostPersonalBudget, hostHomeCurr, autoCurrency)

            return (
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
                      <p className="text-[11px] text-slate-500">
                        Contribution in your home currency ({hostHomeCurr})
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-1">
                    <div className={`flex items-center bg-white border-2 ${minBudgetCalc.isBelowMin ? 'border-amber-500 ring-2 ring-amber-100' : 'border-teal-600/40'} rounded-xl px-3 py-2 shadow-2xs self-start sm:self-auto`}>
                      <span className="text-xs font-bold text-teal-700 mr-2">{hostHomeSymbol}</span>
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
                    <span className="text-[11px] text-teal-800 font-bold bg-white px-2 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
                      ≈ {destSymbol}{convertedDestEquiv.toLocaleString()} {autoCurrency} (Destination)
                    </span>
                  </div>
                </div>

                {/* Quick Presets for Host */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Presets:</span>
                  {(hostHomeCurr === 'EUR' || hostHomeCurr === 'USD' || hostHomeCurr === 'GBP' || hostHomeCurr === 'CHF'
                    ? [minBudgetCalc.minInHostCurr, Math.max(350, minBudgetCalc.minInHostCurr * 1.5), Math.max(500, minBudgetCalc.minInHostCurr * 2), Math.max(750, minBudgetCalc.minInHostCurr * 3)]
                    : [minBudgetCalc.minInHostCurr, Math.max(15000, minBudgetCalc.minInHostCurr * 1.5), Math.max(35000, minBudgetCalc.minInHostCurr * 2), Math.max(50000, minBudgetCalc.minInHostCurr * 3)]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHostPersonalBudget(Math.round(preset))}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                        hostPersonalBudget === Math.round(preset)
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      {hostHomeSymbol}{hostHomeCurr === 'INR' ? `${(Math.round(preset) / 1000).toFixed(1)}k` : Math.round(preset)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Invited Friends List */}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= SECTION 4: CATEGORY BUDGET ALLOCATION (COMPACT & EDITABLE) ================= */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                4. Category Budget Caps (% Allocation)
              </h2>
              <p className="text-[11px] text-slate-400">
                Adjust category breakdown of your {hostHomeSymbol}{hostPersonalBudget.toLocaleString()} {hostHomeCurr} budget
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {totalPctAllocated !== 100 && (
                <button
                  type="button"
                  onClick={handleAutoBalanceCategories}
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 transition cursor-pointer"
                >
                  ⚖️ Auto-Balance
                </button>
              )}
              <button
                type="button"
                onClick={handleResetCategoryDefaults}
                className="text-[11px] font-bold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition cursor-pointer"
                title="Reset to 35/25/20/10/10"
              >
                ↺ Reset (35/25/20/10/10)
              </button>
              <span
                className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${
                  totalPctAllocated === 100
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {totalPctAllocated === 100 ? '✅ 100%' : `⚠️ ${totalPctAllocated}%`}
              </span>
            </div>
          </div>

          {/* Compact Stacked Progress Bar */}
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {categoryConfig.map((cat) => {
              const pct = categoryPcts[cat.key] || 0
              if (pct <= 0) return null
              return (
                <div
                  key={cat.key}
                  style={{ width: `${Math.min(100, pct)}%` }}
                  className={`${cat.color} h-full transition-all duration-300`}
                  title={`${cat.label}: ${pct}% (${hostHomeSymbol}${Math.round(hostPersonalBudget * (pct / 100)).toLocaleString()})`}
                />
              )
            })}
          </div>

          {/* Compressed Editable Category Grid */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categoryConfig.map((cat) => {
              const pct = categoryPcts[cat.key]
              const amount = Math.round(hostPersonalBudget * (pct / 100))

              return (
                <div
                  key={cat.key}
                  className="flex items-center justify-between bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-2xs hover:border-teal-300 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{cat.icon}</span>
                    <span className="text-xs font-bold text-slate-800 truncate">{cat.label}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-slate-500">
                      {hostHomeSymbol}{amount.toLocaleString()}
                    </span>
                    <div className="flex items-center bg-teal-50/90 border border-teal-200 rounded-lg px-2 py-0.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pct}
                        onChange={(e) => handlePctChange(cat.key, parseFloat(e.target.value) || 0)}
                        className="w-9 text-xs font-black text-teal-950 outline-none text-right bg-transparent"
                      />
                      <span className="text-[10px] font-bold text-teal-700 ml-0.5">%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreate}
              className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-md transition text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🚀</span>
              <span>
                {invitedMembers.length > 0
                  ? `Create Trip & Send ${invitedMembers.length} Invite${invitedMembers.length > 1 ? 's' : ''}`
                  : 'Create Trip & Confirm Budget'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('trip-dashboard')}
              className="px-6 py-3.5 border border-slate-200 text-slate-700 font-semibold rounded-2xl hover:bg-slate-50 transition text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
