import type { NavigateFn } from '../common/types'

interface Props {
  canAfford: boolean
  numAmount: number
  currCode: string
  convertedAmount: number
  beforeProjected: number
  afterProjected: number
  newSafeDaily: number
  newRemaining: number
  onReset: () => void
  navigate: NavigateFn
}

export default function RunwayImpactCard({
  canAfford,
  numAmount,
  currCode,
  convertedAmount,
  beforeProjected,
  afterProjected,
  newSafeDaily,
  newRemaining,
  onReset,
  navigate,
}: Props) {
  return (
    <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-5 md:p-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 text-base">Simulation Impact</h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            canAfford ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}
        >
          {canAfford ? '✅ Recommended' : '⚠️ Over Budget Risk'}
        </span>
      </div>

      {/* Outlay */}
      <div className="p-3.5 bg-slate-50 rounded-2xl text-center border border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          Simulated Outlay
        </span>
        <span className="text-xl font-extrabold text-slate-900">
          {currCode === 'EUR' ? '€' : currCode === 'USD' ? '$' : '₹'}{numAmount.toLocaleString()}
        </span>
        <span className="text-xs font-bold text-amber-700 block mt-0.5">
          ≈ ₹{convertedAmount.toLocaleString()} INR
        </span>
      </div>

      {/* Before vs After */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Before Purchase</span>
          <span className="text-sm font-bold text-slate-700 block mt-0.5">Safe Daily: ₹6,765</span>
          <span className="text-xs text-slate-500 block mt-0.5">Projected: ₹{beforeProjected.toLocaleString()}</span>
        </div>

        <div className={`p-3 rounded-2xl border ${canAfford ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <span className={`text-[10px] font-bold uppercase block ${canAfford ? 'text-emerald-700' : 'text-rose-700'}`}>
            After Purchase
          </span>
          <span className={`text-sm font-extrabold block mt-0.5 ${canAfford ? 'text-emerald-800' : 'text-rose-800'}`}>
            Safe Daily: ₹{newSafeDaily.toLocaleString()}
          </span>
          <span className={`text-xs block mt-0.5 ${canAfford ? 'text-emerald-700' : 'text-rose-700'}`}>
            Projected: ₹{afterProjected.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Advice */}
      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
        <p className="font-bold flex items-center gap-1.5">
          <span>🤖 AI Guardian Advice:</span>
        </p>
        <p className="leading-relaxed">
          {canAfford
            ? `This expense fits comfortably inside your budget. You still retain ₹${newRemaining.toLocaleString()} reserve for the rest of the trip.`
            : `Adding this increases your projected overspend. Keep your daily spend below ₹${newSafeDaily.toLocaleString()}/day to compensate.`}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2.5 pt-2">
        <button
          onClick={() => navigate('trip-dashboard')}
          className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition shadow-2xs"
        >
          Add to Expense Ledger
        </button>
        <button
          onClick={onReset}
          className="px-4 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-xs transition"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
