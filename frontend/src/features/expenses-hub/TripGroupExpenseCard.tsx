import type { Expense, Trip } from '../common/types'

interface Props {
  trip: Trip
  expenses: Expense[]
}

export default function TripGroupExpenseCard({ trip, expenses }: Props) {
  const tripSpent = 26172
  const tripBudget = trip.budget || 60000
  const pct = Math.min(100, Math.round((tripSpent / tripBudget) * 100))

  return (
    <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-5 md:p-6 mb-6">
      {/* Trip Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-xl shadow-xs">
            🧳
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{trip.name}</h2>
              <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                Active Group Trip
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {trip.destination} · {trip.partySize || 3} members · Equal split among adults
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 font-semibold block">Trip Spent / Budget:</span>
          <span className="text-sm font-extrabold text-teal-900">
            ₹{tripSpent.toLocaleString()} / ₹{tripBudget.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-3 space-y-1">
        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
          <span>{pct}% Used</span>
          <span>₹{(tripBudget - tripSpent).toLocaleString()} Remaining</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Shared Expenses List */}
      <div className="space-y-2.5 pt-2">
        {expenses.map((e) => (
          <div
            key={e.id}
            className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-sm shrink-0">
                {e.category === 'Accommodation' ? '🏨' : '🍽️'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{e.title}</p>
                <p className="text-[10px] text-slate-400">
                  {e.date} · Paid by {e.payerName} · Split among 3
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-extrabold text-teal-900">
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
