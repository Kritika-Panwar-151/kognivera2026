import { useState } from 'react'
import type { Trip, CategoryCaps, User } from '../types'
import { formatUserDualCurrency, convertCurrency } from '../services/currencyService'

interface Props {
  trip: Trip
  currentUser?: User | null
  isOpen: boolean
  onClose: () => void
  onAccept: (tripId: string, personalBudget: number, categoryCaps: CategoryCaps) => Promise<void>
}

export default function TripInviteModal({ trip, currentUser, isOpen, onClose, onAccept }: Props) {
  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const tripDestCurr = (trip.currency || 'JPY').toUpperCase()

  const getSymbol = (c: string) => {
    if (c === 'EUR') return '€'
    if (c === 'USD') return '$'
    if (c === 'GBP') return '£'
    if (c === 'JPY') return '¥'
    if (c === 'SGD') return 'S$'
    return '₹'
  }

  const homeSymbol = getSymbol(userHomeCurr)

  // Default preset based on currency
  const defaultBudget = userHomeCurr === 'EUR' ? 250 : userHomeCurr === 'USD' ? 300 : 20000
  const [personalBudget, setPersonalBudget] = useState(defaultBudget)
  const [submitting, setSubmitting] = useState(false)

  // Category breakdown based on personal budget
  const [accommodation, setAccommodation] = useState(Math.round(defaultBudget * 0.35))
  const [food, setFood] = useState(Math.round(defaultBudget * 0.25))
  const [transport, setTransport] = useState(Math.round(defaultBudget * 0.2))
  const [activities, setActivities] = useState(Math.round(defaultBudget * 0.1))
  const [misc, setMisc] = useState(Math.round(defaultBudget * 0.1))

  if (!isOpen) return null

  const handleBudgetChange = (amount: number) => {
    const val = Math.max(0, amount)
    setPersonalBudget(val)
    setAccommodation(Math.round(val * 0.35))
    setFood(Math.round(val * 0.25))
    setTransport(Math.round(val * 0.2))
    setActivities(Math.round(val * 0.1))
    setMisc(Math.round(val * 0.1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const presets = userHomeCurr === 'EUR' ? [150, 250, 400, 600] : userHomeCurr === 'USD' ? [200, 300, 500, 750] : [15000, 20000, 30000, 50000]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-teal-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-800 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-xl font-bold"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎉</span>
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Trip Invitation
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black">{trip.name}</h2>
          <p className="text-xs text-teal-100 mt-1">
            📍 {trip.destination} · {trip.startDate} to {trip.endDate}
          </p>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
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
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-black text-lg focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
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
            <div className="flex items-center gap-2 mt-2.5">
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
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              2. Your Category Breakdown Preferences ({userHomeCurr})
            </label>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <span className="text-slate-500 font-medium block">🏨 Stay (35%)</span>
                <span className="font-black text-slate-900">{homeSymbol}{accommodation.toLocaleString()}</span>
                <span className="text-[10px] text-teal-700 block font-mono">≈ {getSymbol(tripDestCurr)}{convertCurrency(accommodation, userHomeCurr, tripDestCurr).toLocaleString()} {tripDestCurr}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <span className="text-slate-500 font-medium block">🍽️ Food (25%)</span>
                <span className="font-black text-slate-900">{homeSymbol}{food.toLocaleString()}</span>
                <span className="text-[10px] text-teal-700 block font-mono">≈ {getSymbol(tripDestCurr)}{convertCurrency(food, userHomeCurr, tripDestCurr).toLocaleString()} {tripDestCurr}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <span className="text-slate-500 font-medium block">🚕 Transport (20%)</span>
                <span className="font-black text-slate-900">{homeSymbol}{transport.toLocaleString()}</span>
                <span className="text-[10px] text-teal-700 block font-mono">≈ {getSymbol(tripDestCurr)}{convertCurrency(transport, userHomeCurr, tripDestCurr).toLocaleString()} {tripDestCurr}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <span className="text-slate-500 font-medium block">🎟️ Activities (10%)</span>
                <span className="font-black text-slate-900">{homeSymbol}{activities.toLocaleString()}</span>
                <span className="text-[10px] text-teal-700 block font-mono">≈ {getSymbol(tripDestCurr)}{convertCurrency(activities, userHomeCurr, tripDestCurr).toLocaleString()} {tripDestCurr}</span>
              </div>
            </div>
          </div>

          {/* Group Budget Impact Card */}
          <div className="bg-teal-50/90 border border-teal-200/80 rounded-2xl p-4 text-xs space-y-1.5">
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
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl hover:bg-slate-50 transition text-center"
            >
              Maybe Later
            </button>
            <button
              type="submit"
              disabled={submitting || personalBudget <= 0}
              className="flex-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold text-xs rounded-2xl shadow-md transition disabled:opacity-50 text-center"
            >
              {submitting ? 'Joining Trip...' : 'Accept & Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
