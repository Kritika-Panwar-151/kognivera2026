import type { DebtItem } from './useSettlement'

interface Props {
  items: DebtItem[]
  totalYouOwe: number
  onToggleSettle: (id: string) => void
}

export default function YouOweList({ items, totalYouOwe, onToggleSettle }: Props) {
  return (
    <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-5 md:p-6 space-y-3.5 mb-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <h2 className="text-sm font-bold text-slate-900">People You Owe</h2>
        </div>
        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
          -₹{totalYouOwe.toLocaleString()} pending
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
              item.isSettled
                ? 'bg-slate-50/70 border-slate-200 opacity-60'
                : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-rose-100 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                {item.avatar}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-900 text-sm truncate">{item.person}</p>
                  <span className="text-xs font-extrabold text-rose-800">
                    you owe ₹{item.amount.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{item.reason}</p>
              </div>
            </div>

            <button
              onClick={() => onToggleSettle(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 shadow-2xs ${
                item.isSettled
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
            >
              <span>{item.isSettled ? '✓ Settled' : 'Settle'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
