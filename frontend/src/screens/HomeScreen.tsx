import type { NavigateFn, Trip } from '../types'

interface Props {
  navigate: NavigateFn
  trips: Trip[]
  onSelectTrip: (trip: Trip) => void
}

const tripImages: Record<string, string> = {
  europe:
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  goa:
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
}

export default function HomeScreen({ navigate, trips, onSelectTrip }: Props) {
  return (
    <div className="min-h-screen bg-[#f0fdfa] p-8 max-w-6xl">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#0f766e] text-sm font-medium mb-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          My Trips
        </div>

        <h1 className="text-3xl font-bold text-[#164e63]">
          Where are you going next?
        </h1>

        <p className="text-[#64748b] mt-1.5">
          Track budgets, split expenses, and travel smarter.
        </p>
      </div>

      {/* Trip Cards */}
      {trips.length === 0 ? (
        <div className="bg-white rounded-3xl border border-teal-100 p-8 text-center shadow-sm max-w-md mx-auto my-10">
          <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-2xs">
            ✈️
          </div>
          <h2 className="text-xl font-black text-slate-800">No Trips Created Yet</h2>
          <p className="text-xs text-slate-500 mt-2 mb-6 leading-relaxed">
            You don't have any trips yet. Create your first trip to start managing your budget, currencies, and travel splits!
          </p>
          <button
            type="button"
            onClick={() => navigate('create-trip')}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-md transition text-sm flex items-center justify-center gap-2"
          >
            <span>+</span> Plan Your First Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {trips.map((trip) => {
          const pct = Math.round((trip.spent / trip.budget) * 100)
          const remaining = trip.budget - trip.spent
          const status = pct > 80 ? 'danger' : pct > 60 ? 'warning' : 'healthy'

          const statusColors = {
            healthy: {
              bar: 'bg-emerald-500',
              badge: 'bg-white/90 text-emerald-700',
              text: 'text-emerald-600',
            },
            warning: {
              bar: 'bg-amber-500',
              badge: 'bg-white/90 text-amber-700',
              text: 'text-amber-600',
            },
            danger: {
              bar: 'bg-red-500',
              badge: 'bg-white/90 text-red-700',
              text: 'text-red-600',
            },
          }[status]

          return (
            <div
              key={trip.id}
              className="bg-white rounded-2xl shadow-sm border border-[#ccfbf1] overflow-hidden hover:shadow-lg transition-all duration-300"
            >

              {/* Travel Photo */}
              <div className="h-40 relative overflow-hidden">
                <img
                  src={
                    tripImages[trip.id] ||
                    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
                  }
                  alt={trip.destination}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Photo overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

                <span
                  className={`absolute top-4 left-4 inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors.badge}`}
                >
                  Active
                </span>

                <div className="absolute bottom-3 left-4 text-white">
                  <p className="text-xs font-medium opacity-90">
                    {trip.destination}
                  </p>
                </div>

                <div className="absolute bottom-3 right-4">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    opacity="0.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5">
                <h3 className="font-bold text-[#164e63] text-lg leading-tight">
                  {trip.name}
                </h3>

                <p className="text-slate-400 text-sm mt-0.5">
                  {trip.startDate} – {trip.endDate}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Budget</p>
                    <p className="text-sm font-bold text-slate-800">
                      ₹{trip.budget.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Remaining</p>
                    <p className={`text-sm font-bold ${statusColors.text}`}>
                      ₹{remaining.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-slate-400">
                      ₹{trip.spent.toLocaleString()} spent
                    </span>

                    <span className={`text-xs font-semibold ${statusColors.text}`}>
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${statusColors.bar} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => onSelectTrip(trip)}
                  className="mt-4 w-full py-2.5 bg-[#0f766e] text-white rounded-xl text-sm font-semibold hover:bg-[#115e59] transition-colors"
                >
                  View Trip
                </button>
              </div>
            </div>
          )
        })}

        {/* New Trip */}
        <button
          onClick={() => navigate('create-trip')}
          className="bg-white rounded-2xl border-2 border-dashed border-[#99f6e4] flex flex-col items-center justify-center gap-3 p-8 hover:border-[#0f766e] hover:bg-[#ecfdf5] transition-all group min-h-[300px]"
        >
          <div className="w-14 h-14 bg-[#ccfbf1] rounded-2xl flex items-center justify-center group-hover:bg-[#99f6e4] transition-colors">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[#0f766e]"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>

          <div className="text-center">
            <p className="font-semibold text-[#164e63]">
              New Trip
            </p>

            <p className="text-sm text-slate-400 mt-0.5">
              Plan your next adventure
            </p>
          </div>
        </button>
      </div>
      )}

      {/* Bottom Travel Banner */}
      <div className="relative overflow-hidden rounded-2xl p-7 flex items-center justify-between bg-gradient-to-r from-[#0f766e] via-[#0891b2] to-[#38bdf8]">
        <div className="relative z-10">
          <p className="text-white font-bold text-lg">
            Ready for your next adventure?
          </p>

          <p className="text-white/80 text-sm mt-0.5">
            Snap. Extract. Split. Track. Predict.
          </p>
        </div>

        <button
          onClick={() => navigate('create-trip')}
          className="relative z-10 px-5 py-2.5 bg-white text-[#0f766e] rounded-xl font-semibold text-sm hover:bg-[#ecfeff] transition-colors shrink-0"
        >
          + Create New Trip
        </button>

        {/* Decorative circles */}
        <div className="absolute -right-10 -top-20 w-56 h-56 rounded-full border border-white/20" />
        <div className="absolute right-10 -bottom-32 w-64 h-64 rounded-full border border-white/10" />
      </div>
    </div>
  )
}