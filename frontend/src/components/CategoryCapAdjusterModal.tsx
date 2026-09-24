import { useState, useEffect } from 'react'
import type { Trip, CategoryCaps } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface Props {
  isOpen: boolean
  onClose: () => void
  trip?: Trip | null
  onSaveCaps?: (updatedCaps: CategoryCaps) => void
}

export default function CategoryCapAdjusterModal({
  isOpen,
  onClose,
  trip,
  onSaveCaps,
}: Props) {
  const budget = trip?.budget || 60000
  const currencySymbol = trip?.currency === 'EUR' ? '€' : trip?.currency === 'USD' ? '$' : '₹'

  const defaultCaps: CategoryCaps = trip?.categoryCaps || {
    accommodation: Math.round(budget * 0.35),
    food: Math.round(budget * 0.25),
    transport: Math.round(budget * 0.20),
    activities: Math.round(budget * 0.10),
    misc: Math.round(budget * 0.10),
  }

  const [caps, setCaps] = useState<CategoryCaps>(defaultCaps)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (trip?.categoryCaps) {
      setCaps(trip.categoryCaps)
    }
  }, [trip?.categoryCaps])

  if (!isOpen) return null

  const totalAllocated =
    (Number(caps.accommodation) || 0) +
    (Number(caps.food) || 0) +
    (Number(caps.transport) || 0) +
    (Number(caps.activities) || 0) +
    (Number(caps.misc) || 0)

  const remaining = budget - totalAllocated

  const handleUpdate = (cat: keyof CategoryCaps, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0)
    setCaps((prev) => ({
      ...prev,
      [cat]: num,
    }))
  }

  const handleAutoBalance = () => {
    setCaps({
      accommodation: Math.round(budget * 0.35),
      food: Math.round(budget * 0.25),
      transport: Math.round(budget * 0.20),
      activities: Math.round(budget * 0.10),
      misc: Math.round(budget * 0.10),
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    if (trip) {
      trip.categoryCaps = caps
    }

    try {
      if (isSupabaseConfigured && trip?.id) {
        await supabase
          .from('trips')
          .update({
            category_caps: caps,
          })
          .eq('id', trip.id)
      }
      localStorage.setItem(`trip_caps_${trip?.id}`, JSON.stringify(caps))
    } catch (e) {
      console.warn('Failed saving category caps to Supabase:', e)
    }

    if (onSaveCaps) {
      onSaveCaps(caps)
    }

    setIsSaving(false)
    onClose()
  }

  const categoriesConfig: Array<{
    key: keyof CategoryCaps
    name: string
    icon: string
    benchmarkPct: number
  }> = [
    { key: 'accommodation', name: 'Stay / Accommodation', icon: '🏨', benchmarkPct: 35 },
    { key: 'food', name: 'Food & Dining', icon: '🍽️', benchmarkPct: 25 },
    { key: 'transport', name: 'Transport & Transit', icon: '🚗', benchmarkPct: 20 },
    { key: 'activities', name: 'Activities & Sightseeing', icon: '⭐', benchmarkPct: 10 },
    { key: 'misc', name: 'Shopping & Misc', icon: '🛍️', benchmarkPct: 10 },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-teal-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-teal-50/60 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl shadow-xs">
              📊
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-slate-900">Adjust Category Caps</h2>
              <p className="text-xs text-slate-500">Rebalance spending limits across categories</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Total Budget Checksum Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium block">Total Group Trip Fund:</span>
            <span className="text-base font-black text-slate-900">
              {currencySymbol}{budget.toLocaleString()}
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-500 font-medium block">Allocated Across Caps:</span>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block ${
                Math.abs(remaining) < 10
                  ? 'bg-emerald-100 text-emerald-800'
                  : remaining > 0
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-rose-100 text-rose-900'
              }`}
            >
              {currencySymbol}{totalAllocated.toLocaleString()} ({Math.round((totalAllocated / budget) * 100)}%)
              {remaining !== 0 && ` · ${remaining > 0 ? `+${remaining.toLocaleString()} unassigned` : `${remaining.toLocaleString()} over`}`}
            </span>
          </div>
        </div>

        {/* Category Inputs Body */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Category Allocations
            </span>
            <button
              type="button"
              onClick={handleAutoBalance}
              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline"
            >
              Reset to Standard (35/25/20/10/10)
            </button>
          </div>

          {categoriesConfig.map((cfg) => {
            const currentCap = Number(caps[cfg.key]) || 0
            const pct = budget > 0 ? Math.round((currentCap / budget) * 100) : 0

            return (
              <div
                key={cfg.key}
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-teal-300 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{cfg.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{cfg.name}</span>
                    <span className="text-[10px] text-slate-400">
                      Standard: {cfg.benchmarkPct}% ({currencySymbol}{Math.round(budget * (cfg.benchmarkPct / 100)).toLocaleString()})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200/60">
                    {pct}%
                  </span>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 w-32 shadow-2xs focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-200">
                    <span className="text-xs font-bold text-slate-400 mr-1">{currencySymbol}</span>
                    <input
                      type="number"
                      step="100"
                      value={currentCap}
                      onChange={(e) => handleUpdate(cfg.key, e.target.value)}
                      className="w-full text-xs font-black text-slate-900 outline-none text-right"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-xs shadow-md transition flex items-center justify-center gap-2"
          >
            <span>{isSaving ? 'Saving...' : 'Save & Sync Category Caps'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 border border-slate-200 text-slate-600 font-semibold rounded-2xl text-xs hover:bg-slate-100 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
