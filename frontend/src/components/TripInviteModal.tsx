import { useState } from 'react'
import type { Trip, CategoryCaps, User } from '../types'
import { formatUserDualCurrency, convertCurrency, getCurrencySymbol } from '../services/currencyService'

interface Props {
  trip: Trip
  currentUser?: User | null
  isOpen: boolean
  onClose: () => void
  onAccept: (tripId: string, personalBudget: number, categoryCaps: CategoryCaps) => Promise<void>
}

export default function TripInviteModal({ trip, currentUser, isOpen, onClose, onAccept }: Props) {
  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const tripDestCurr = (trip?.currency || 'JPY').toUpperCase()

  const homeSymbol = getCurrencySymbol(userHomeCurr)
  const destSymbol = getCurrencySymbol(tripDestCurr)

  const isHighVal = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'SGD'].includes(userHomeCurr)
  const defaultBudget = isHighVal ? 250 : userHomeCurr === 'JPY' ? 35000 : 20000
  const [personalBudget, setPersonalBudget] = useState(defaultBudget)
  const [submitting, setSubmitting] = useState(false)

  // Category breakdown based on personal budget
  const [accommodation, setAccommodation] = useState(Math.round(defaultBudget * 0.35))
  const [food, setFood] = useState(Math.round(defaultBudget * 0.25))
  const [transport, setTransport] = useState(Math.round(defaultBudget * 0.2))
  const [activities, setActivities] = useState(Math.round(defaultBudget * 0.1))
  const [misc, setMisc] = useState(Math.max(0, defaultBudget - (Math.round(defaultBudget * 0.35) + Math.round(defaultBudget * 0.25) + Math.round(defaultBudget * 0.2) + Math.round(defaultBudget * 0.1))))

  if (!isOpen || !trip) return null

  const handleBudgetChange = (amount: number) => {
    const val = Math.max(0, amount)
    setPersonalBudget(val)
    const acc = Math.round(val * 0.35)
    const fd = Math.round(val * 0.25)
    const tr = Math.round(val * 0.2)
    const act = Math.round(val * 0.1)
    const ms = Math.max(0, val - (acc + fd + tr + act))
    setAccommodation(acc)
    setFood(fd)
    setTransport(tr)
    setActivities(act)
    setMisc(ms)
  }

  const categorySum = accommodation + food + transport + activities + misc
  const isBalanced = categorySum === personalBudget

  const handleAutoBalance = () => {
    const sum4 = accommodation + food + transport + activities
    if (personalBudget >= sum4) {
      setMisc(personalBudget - sum4)
    } else {
      handleBudgetChange(personalBudget)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isBalanced) return
    setSubmitting(true)
    try {
      const caps: CategoryCaps = {
        accommodation,
        food,
        transport,
        activities,
        misc,
      }
      await onAccept(trip.id, personalBudget, caps)
      onClose()
    } catch (err) {
      console.error('Failed to accept invite:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Dual Currency Calculations
  const personalDual = formatUserDualCurrency(personalBudget, userHomeCurr, userHomeCurr, tripDestCurr)
  const currentGroupDual = formatUserDualCurrency(trip.budget, tripDestCurr, userHomeCurr, tripDestCurr)
  const newGroupDual = formatUserDualCurrency(
    currentGroupDual.primaryAmount + personalBudget,
    userHomeCurr,
    userHomeCurr,
    tripDestCurr
  )

  const presets = isHighVal
    ? [150, 250, 400, 600]
    : userHomeCurr === 'JPY'
    ? [20000, 35000, 50000, 80000]
    : [15000, 20000, 30000, 50000]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-teal-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header - Fixed top */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 p-5 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-xl font-bold p-1 rounded-lg hover:bg-white/10 transition"
            title="Close"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎉</span>
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Trip Invitation
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black">{trip.name}</h2>
          <p className="text-xs text-teal-100 mt-0.5">
            📍 {trip.destination} · {trip.startDate} to {trip.endDate}
          </p>
        </div>

        {/* Content Form - Scrollable body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              1. Your Personal Contribution ({userHomeCurr})
            </label>
            <p className="text-xs text-slate-500 mb-2 leading-relaxed">
              Enter amount in your home currency. It will be added to the shared trip fund.
            </p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-extrabold text-sm">
                {homeSymbol}
              </span>
              <input
                type="number"
                min="0"
                step="50"
                value={personalBudget}
                onChange={(e) => handleBudgetChange(Number(e.target.value))}
                className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black text-lg focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                required
              />
            </div>

            {/* Destination Equivalent Subtext */}
            <div className="mt-2 flex items-center justify-between text-xs bg-teal-50/80 border border-teal-200/70 p-2.5 rounded-xl text-teal-900 font-bold">
              <span>Home Amount: <strong>{personalDual.primary}</strong></span>
              <span className="text-[11px] bg-white text-teal-800 border border-teal-200 px-2 py-0.5 rounded-lg shadow-2xs">
                {personalDual.secondary} (Destination)
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 mt-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleBudgetChange(preset)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition ${
                    personalBudget === preset
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  {homeSymbol}{userHomeCurr === 'INR' ? `${(preset / 1000).toFixed(0)}k` : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Category Allocation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Editable Category Breakdown ({userHomeCurr})
              </label>
              <button
                type="button"
                onClick={() => handleBudgetChange(personalBudget)}
                className="text-[10px] font-semibold text-teal-700 hover:underline"
              >
                Reset Defaults
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Accommodation */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70 space-y-1">
                <label className="text-slate-600 font-bold block text-[11px]">🏨 Stay (35%)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2 text-slate-400 font-bold text-xs">{homeSymbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={accommodation}
                    onChange={(e) => setAccommodation(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                  />
                </div>
                <span className="text-[10px] text-teal-700 block font-mono">
                  ≈ {destSymbol}{convertCurrency(accommodation, userHomeCurr, tripDestCurr).toLocaleString()}
                </span>
              </div>

              {/* Food */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70 space-y-1">
                <label className="text-slate-600 font-bold block text-[11px]">🍽️ Food (25%)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2 text-slate-400 font-bold text-xs">{homeSymbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={food}
                    onChange={(e) => setFood(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                  />
                </div>
                <span className="text-[10px] text-teal-700 block font-mono">
                  ≈ {destSymbol}{convertCurrency(food, userHomeCurr, tripDestCurr).toLocaleString()}
                </span>
              </div>

              {/* Transport */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70 space-y-1">
                <label className="text-slate-600 font-bold block text-[11px]">🚕 Transport (20%)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2 text-slate-400 font-bold text-xs">{homeSymbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={transport}
                    onChange={(e) => setTransport(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                  />
                </div>
                <span className="text-[10px] text-teal-700 block font-mono">
                  ≈ {destSymbol}{convertCurrency(transport, userHomeCurr, tripDestCurr).toLocaleString()}
                </span>
              </div>

              {/* Activities */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70 space-y-1">
                <label className="text-slate-600 font-bold block text-[11px]">🎟️ Activities (10%)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2 text-slate-400 font-bold text-xs">{homeSymbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={activities}
                    onChange={(e) => setActivities(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                  />
                </div>
                <span className="text-[10px] text-teal-700 block font-mono">
                  ≈ {destSymbol}{convertCurrency(activities, userHomeCurr, tripDestCurr).toLocaleString()}
                </span>
              </div>

              {/* Misc */}
              <div className="col-span-2 bg-slate-50 p-2 rounded-xl border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-600 font-bold block text-[11px]">🧩 Misc / Buffer (10%)</label>
                  <span className="text-[10px] text-slate-400">Flexible fund</span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-2 text-slate-400 font-bold text-xs">{homeSymbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={misc}
                    onChange={(e) => setMisc(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none"
                  />
                </div>
                <span className="text-[10px] text-teal-700 block font-mono">
                  ≈ {destSymbol}{convertCurrency(misc, userHomeCurr, tripDestCurr).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Validation Balance Card */}
            <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-center justify-between border ${
              isBalanced 
                ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800' 
                : 'bg-amber-50 border-amber-200/80 text-amber-900'
            }`}>
              <div className="flex items-center gap-1.5 font-semibold">
                <span>{isBalanced ? '✅' : '⚠️'}</span>
                <span>
                  {isBalanced
                    ? `Allocated: ${homeSymbol}${categorySum.toLocaleString()} (100%)`
                    : `Sum (${homeSymbol}${categorySum.toLocaleString()}) ≠ Budget (${homeSymbol}${personalBudget.toLocaleString()})`}
                </span>
              </div>
              {!isBalanced && (
                <button
                  type="button"
                  onClick={handleAutoBalance}
                  className="text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg transition shadow-2xs"
                >
                  Auto-Balance
                </button>
              )}
            </div>
          </div>

          {/* Group Budget Impact Card */}
          <div className="bg-teal-50/90 border border-teal-200/80 rounded-2xl p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-teal-900 font-bold">
              <span>Current Group Budget:</span>
              <div className="text-right">
                <span>{currentGroupDual.primary}</span>
                <span className="block text-[10px] text-teal-600 font-normal">{currentGroupDual.secondary}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-teal-700 font-semibold">
              <span>+ Your Personal Budget:</span>
              <div className="text-right">
                <span>{personalDual.primary}</span>
                <span className="block text-[10px] text-teal-600 font-normal">{personalDual.secondary}</span>
              </div>
            </div>
            <div className="border-t border-teal-200/80 pt-2 flex items-center justify-between text-teal-950 font-black text-sm">
              <span>New Total Group Budget:</span>
              <div className="text-right">
                <span className="text-teal-700">{newGroupDual.primary}</span>
                <span className="block text-[10px] text-teal-600 font-normal">{newGroupDual.secondary}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl hover:bg-slate-50 transition text-center"
            >
              Maybe Later
            </button>
            <button
              type="submit"
              disabled={submitting || personalBudget <= 0 || !isBalanced}
              className="flex-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold text-xs rounded-2xl shadow-md transition disabled:opacity-50 text-center"
            >
              {submitting
                ? 'Joining Trip...'
                : !isBalanced
                ? 'Please Balance Categories'
                : 'Accept & Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
