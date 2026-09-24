import { useState } from 'react'
import type { Trip, CategoryCaps } from '../types'

interface Props {
  trip: Trip
  isOpen: boolean
  onClose: () => void
  onAccept: (tripId: string, personalBudget: number, categoryCaps: CategoryCaps) => Promise<void>
}

export default function TripInviteModal({ trip, isOpen, onClose, onAccept }: Props) {
  const [personalBudget, setPersonalBudget] = useState(20000)
  const [submitting, setSubmitting] = useState(false)

  // Category breakdown based on personal budget
  const [accommodation, setAccommodation] = useState(7000)
  const [food, setFood] = useState(5000)
  const [transport, setTransport] = useState(4000)
  const [activities, setActivities] = useState(2000)
  const [misc, setMisc] = useState(2000)

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

  const newTotalGroupBudget = trip.budget + personalBudget

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-teal-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-linear-to-r from-teal-700 to-emerald-800 p-6 text-white relative">
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
              1. Your Personal Contribution ({trip.currency})
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Enter how much money you want to allocate for this trip. This will be added to the shared group budget.
            </p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                {trip.currency === 'INR' ? '₹' : trip.currency}
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={personalBudget}
                onChange={(e) => handleBudgetChange(Number(e.target.value))}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold text-base focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition"
                required
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 mt-2">
              {[15000, 20000, 30000, 50000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleBudgetChange(preset)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    personalBudget === preset
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                  }`}
                >
                  ₹{(preset / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* Category Allocation */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              2. Your Category Breakdown Preferences
            </label>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium block">🏨 Stay (35%)</span>
                <span className="font-bold text-slate-900">₹{accommodation.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium block">🍽️ Food (25%)</span>
                <span className="font-bold text-slate-900">₹{food.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium block">🚕 Transport (20%)</span>
                <span className="font-bold text-slate-900">₹{transport.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-500 font-medium block">🎟️ Activities (10%)</span>
                <span className="font-bold text-slate-900">₹{activities.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Group Budget Impact Card */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 text-xs">
            <div className="flex items-center justify-between text-teal-900 font-bold mb-1">
              <span>Current Group Budget:</span>
              <span>₹{trip.budget.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-teal-700 font-semibold mb-2">
              <span>+ Your Personal Budget:</span>
              <span>₹{personalBudget.toLocaleString()}</span>
            </div>
            <div className="border-t border-teal-200/80 pt-2 flex items-center justify-between text-teal-950 font-black text-sm">
              <span>New Total Group Budget:</span>
              <span className="text-teal-700">₹{newTotalGroupBudget.toLocaleString()}</span>
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
