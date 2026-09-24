import React from 'react'
import type { BreachDetail } from '../features/category-spending/useCategoryCaps'

interface Props {
  breachDetail: BreachDetail | null
  isDismissed: boolean
  onDismiss: () => void
  currencySymbol?: string
  onManageCaps?: () => void
}

export default function CategoryBreachAlert({
  breachDetail,
  isDismissed,
  onDismiss,
  currencySymbol = '₹',
  onManageCaps,
}: Props) {
  if (!breachDetail || isDismissed) return null

  const { category, overshoot, foreignTrigger } = breachDetail

  return (
    <div className="mb-6 rounded-3xl border-2 border-rose-300 bg-linear-to-r from-rose-50 via-red-50 to-orange-50 p-5 md:p-6 shadow-md animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="flex items-start justify-between gap-4">
        {/* Left Icon & Main Alert Text */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-sm animate-bounce">
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider bg-rose-200 text-rose-950 px-2.5 py-0.5 rounded-full border border-rose-300">
                Category Cap Breach Detected
              </span>
              <span className="text-xs font-bold text-rose-800">
                {category.icon} {category.name}
              </span>
            </div>

            <h3 className="text-base md:text-lg font-black text-rose-950 mt-1">
              {category.name} has exceeded its budget cap by {currencySymbol}{overshoot.toLocaleString()}
            </h3>

            {/* 4 Core PS-08 Metrics: Category, Cap, Current Spend, Overshoot */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Category</span>
                <span className="text-xs font-black text-slate-900 truncate block">
                  {category.name}
                </span>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Budget Cap</span>
                <span className="text-xs font-black text-slate-900">
                  {currencySymbol}{category.cap.toLocaleString()}
                </span>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-600 uppercase block">Current Spend</span>
                <span className="text-xs font-black text-rose-700">
                  {currencySymbol}{category.spent.toLocaleString()} ({category.pct}%)
                </span>
              </div>

              <div className="bg-rose-100 p-2.5 rounded-xl border border-rose-300">
                <span className="text-[10px] font-black text-rose-900 uppercase block">Overshoot</span>
                <span className="text-xs font-black text-rose-900">
                  +{currencySymbol}{overshoot.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Triggering Foreign-Currency Expense Notice */}
            {foreignTrigger && (
              <div className="mt-3 p-3 bg-white/90 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🌐</span>
                  <span className="text-slate-700 font-medium">
                    Triggered by foreign expense: <strong>{foreignTrigger.currency} {foreignTrigger.originalAmount}</strong> ({currencySymbol}{foreignTrigger.convertedAmount.toLocaleString()}) at <em>{foreignTrigger.merchant}</em>
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md self-start sm:self-auto border border-amber-200">
                  Real-time FX Converted
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1.5 bg-white/90 hover:bg-white text-rose-800 hover:text-rose-950 text-xs font-black rounded-xl border border-rose-200 shadow-2xs transition flex items-center gap-1.5 shrink-0"
          title="Dismiss this breach warning"
        >
          <span>✕</span>
          <span className="hidden sm:inline">Dismiss Alert</span>
        </button>
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-rose-200/80 flex items-center justify-between flex-wrap gap-2 text-xs">
        <p className="text-rose-900 font-medium">
          💡 <strong>Guardian Recommendation:</strong> Reallocate from another surplus category or re-balance spending for upcoming days.
        </p>
        {onManageCaps && (
          <button
            type="button"
            onClick={onManageCaps}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-2xs transition text-[11px]"
          >
            Adjust Category Caps →
          </button>
        )}
      </div>
    </div>
  )
}
