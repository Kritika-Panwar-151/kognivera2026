import type { Trip, Expense } from '../../types'
import { useCategoryCaps } from './useCategoryCaps'

interface Props {
  trip?: Trip | null
  expenses?: Expense[]
}

export default function CategoryCapsDrawer({ trip, expenses = [] }: Props) {
  const { isOpen, toggleOpen, categories, totalCap, totalSpent, currencySymbol } = useCategoryCaps(trip, expenses)

  return (
    <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden mb-6">
      <button
        onClick={toggleOpen}
        className="w-full p-5 flex items-center justify-between hover:bg-slate-50/50 transition text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-lg">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Category Budget Caps</h3>
              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                5 Monitored
              </span>
              {categories.some((c) => c.status === 'breached') && (
                <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                  Cap Breached!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currencySymbol}{totalSpent.toLocaleString()} spent of {currencySymbol}{totalCap.toLocaleString()} allocated across caps
            </p>
          </div>
        </div>

        <span className={`text-slate-400 font-bold text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="p-5 pt-0 border-t border-slate-100 space-y-4">
          {categories.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                  {c.status === 'breached' && (
                    <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200">
                      OVER BY +{currencySymbol}{c.overshoot.toLocaleString()}
                    </span>
                  )}
                </span>
                <span className={`font-bold ${c.status === 'breached' ? 'text-rose-600' : 'text-slate-600'}`}>
                  {currencySymbol}{c.spent.toLocaleString()} / {currencySymbol}{c.cap.toLocaleString()} ({c.pct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    c.status === 'breached'
                      ? 'bg-rose-500'
                      : c.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-teal-600'
                  }`}
                  style={{ width: `${Math.min(c.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
