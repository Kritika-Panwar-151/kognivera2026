import type { Expense, NavigateFn } from '../common/types'

interface Props {
  expenses: Expense[]
  totalSpend: number
  navigate: NavigateFn
}

export default function PersonalExpenseCard({ expenses, totalSpend, navigate }: Props) {
  return (
    <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-5 md:p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-xl shadow-xs">
            👤
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Personal & Flexible Expenses Hub</h2>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                Non-Trip Fund
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual spending across any trip · Excluded from group trip budgets
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('receipt-scanner')}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>📸</span>
            <span>Scan Receipt</span>
          </button>
          <button
            onClick={() => navigate('add-expense')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Spending Total */}
      <div className="my-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">Total Personal Spend:</span>
        <span className="text-sm font-extrabold text-indigo-950">₹{totalSpend.toLocaleString()} INR</span>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {expenses.map((e) => (
          <div
            key={e.id}
            className="p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-sm shrink-0">
                {e.category === 'Food' ? '🍽️' : '🛍️'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{e.title}</p>
                <p className="text-[10px] text-slate-400">{e.date} · Paid by {e.payerName}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-extrabold text-slate-900">
                {e.currency} {e.amount}
              </p>
              <p className="text-[10px] text-slate-400">≈ ₹{e.homeAmount?.toLocaleString()} INR</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
