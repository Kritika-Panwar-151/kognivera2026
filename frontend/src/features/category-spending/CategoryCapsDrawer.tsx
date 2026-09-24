import type { Trip } from '../common/types'
import { useCategoryCaps } from './useCategoryCaps'

interface Props {
  trip: Trip
}

export default function CategoryCapsDrawer({ trip }: Props) {
  const { isOpen, toggleOpen, categories, totalCap, totalSpent } = useCategoryCaps(trip)

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
                5 Tracked
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ₹{totalSpent.toLocaleString()} spent of ₹{totalCap.toLocaleString()} allocated across caps
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
                </span>
                <span className="font-bold text-slate-600">
                  ₹{c.spent.toLocaleString()} / ₹{c.cap.toLocaleString()} ({c.pct}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${c.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
