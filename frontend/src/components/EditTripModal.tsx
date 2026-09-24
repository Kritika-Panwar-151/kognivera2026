import { useState } from 'react'
import type { Trip } from '../types'

interface Props {
  trip: Trip
  isOpen: boolean
  onClose: () => void
  onSave: (updated: Trip) => void
}

export default function EditTripModal({ trip, isOpen, onClose, onSave }: Props) {
  const [name, setName] = useState(trip?.name || '')
  const [destination, setDestination] = useState(trip?.destination || '')
  const [budget, setBudget] = useState(String(trip?.budget || 0))
  const [startDate, setStartDate] = useState(trip?.startDate || '')
  const [endDate, setEndDate] = useState(trip?.endDate || '')

  if (!isOpen || !trip) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numBudget = parseFloat(budget) || trip.budget

    const updated: Trip = {
      ...trip,
      name: name.trim() || trip.name,
      destination: destination.trim() || trip.destination,
      budget: numBudget,
      startDate,
      endDate,
    }

    onSave(updated)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-teal-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-teal-50 via-white to-cyan-50 border-b border-teal-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Edit Trip Details</h3>
              <p className="text-[11px] text-slate-500">Update destination, dates & budget</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Trip Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Destination City / Region
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Total Trip Budget ({trip.currency || 'INR'})
            </label>
            <input
              type="number"
              step="1000"
              min="1000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Start Date
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="e.g. 12 Sep 2026"
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                End Date
              </label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="e.g. 20 Sep 2026"
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
            >
              Save Trip Details
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
