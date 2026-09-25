import { useState } from 'react'
import type { NavigateFn, Trip, User, Expense } from '../types'
import EditTripModal from '../components/EditTripModal'
import { formatUserDualCurrency, getTripDestinationCurrency, isTripMatch } from '../services/currencyService'
import { resolveCityName } from '../services/geminiService'
import { useBudget } from '../features/overall-budget/useBudget'

interface Props {
  navigate: NavigateFn
  trips: Trip[]
  currentUser?: User | null
  onSelectTrip: (trip: Trip) => void
  onUpdateTrip?: (updatedTrip: Trip) => void
  expenses?: Expense[]
}

const tripImages: Record<string, string> = {
  europe:
    'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  goa:
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
}

export default function HomeScreen({ navigate, trips, currentUser, onSelectTrip, onUpdateTrip, expenses = [] }: Props) {
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [isOtherTripsExpanded, setIsOtherTripsExpanded] = useState(true)
  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()

  const activeTrip = trips.length > 0 ? trips[0] : null
  const otherTrips = trips.length > 1 ? trips.slice(1) : []

  return (
    <div className="min-h-screen bg-[#f0fdfa] p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[#0f766e] text-sm font-medium mb-1">
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
          My Travel Dashboard
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold text-[#164e63] tracking-tight">
          Where are you going next?
        </h1>

        <p className="text-[#64748b] text-xs md:text-sm mt-1">
          Active destination tracker with side-by-side personal and group budget insights.
        </p>
      </div>

      {/* Empty State */}
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
        <>
          {/* =========================================================================
              PRIMARY ACTIVE TRIP / ACTIVE DESTINATION CARD (PROMINENT TOP CARD)
              Contains Personal & Group budgets side by side inside active country view
          ========================================================================= */}
          {activeTrip && (() => {
            const resolvedCity = resolveCityName(activeTrip.destination, activeTrip.name)
            const tripDestCurr = getTripDestinationCurrency(activeTrip)

            // Group & Personal budget metrics calculated via useBudget hook
            const {
              budget: groupBudget,
              spent: groupSpent,
              remaining: groupRemaining,
              pct: groupPct,
              personalBudget,
              personalSpent,
              personalRemaining,
              personalPct,
            } = useBudget(activeTrip, currentUser || undefined, expenses)

            const groupBudgetDual = formatUserDualCurrency(groupBudget, userHomeCurr, userHomeCurr, tripDestCurr)
            const groupRemainingDual = formatUserDualCurrency(groupRemaining, userHomeCurr, userHomeCurr, tripDestCurr)
            const personalBudgetDual = formatUserDualCurrency(personalBudget, userHomeCurr, userHomeCurr, tripDestCurr)
            const personalRemainingDual = formatUserDualCurrency(personalRemaining, userHomeCurr, userHomeCurr, tripDestCurr)

            return (
              <div className="bg-white rounded-3xl border border-teal-200 shadow-md overflow-hidden ring-1 ring-teal-100">
                {/* Active Country Banner */}
                <div className="relative h-48 md:h-56">
                  <img
                    src={
                      tripImages[activeTrip.id] ||
                      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80'
                    }
                    alt={resolvedCity}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent" />

                  {/* Active Badge */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <span>📍</span> Active Country Destination
                    </span>
                    <span className="bg-white/95 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
                      {resolvedCity}
                    </span>
                  </div>

                  {/* Banner Content */}
                  <div className="absolute bottom-4 left-4 right-4 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-extrabold">{activeTrip.name}</h2>
                      <p className="text-xs text-slate-200 mt-0.5 font-medium">
                        {activeTrip.startDate} – {activeTrip.endDate} · {memberCount} Group Members
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectTrip(activeTrip)}
                        className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition flex items-center gap-1.5"
                      >
                        <span>Open Dashboard</span>
                        <span>→</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTrip(activeTrip)}
                        className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs transition border border-white/30"
                        title="Edit Active Trip"
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dual Budget Panel: Group Budget & Personal Budget Side-by-Side */}
                <div className="p-5 md:p-6 bg-slate-50/70 border-t border-teal-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GROUP BUDGET BOX */}
                  <div className="bg-white p-4.5 rounded-2xl border border-teal-150 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-lg font-bold">
                          👥
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">Group Trip Budget</h3>
                          <p className="text-[10px] text-slate-500">Shared pool for all {memberCount} members</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                        {groupPct}% Used
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Group Budget</span>
                        <span className="font-extrabold text-slate-900 text-sm">{groupBudgetDual.primary}</span>
                        <span className="text-[10px] text-teal-700 font-mono block">≈ {groupBudgetDual.secondary}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Group Remaining</span>
                        <span className="font-extrabold text-teal-700 text-sm">{groupRemainingDual.primary}</span>
                        <span className="text-[10px] text-teal-700 font-mono block">≈ {groupRemainingDual.secondary}</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${groupPct > 80 ? 'bg-rose-500' : 'bg-teal-600'} transition-all`}
                        style={{ width: `${Math.min(groupPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* MY PERSONAL BUDGET BOX */}
                  <div className="bg-white p-4.5 rounded-2xl border border-indigo-150 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-lg font-bold">
                          👤
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-indigo-950">My Personal Budget</h3>
                          <p className="text-[10px] text-slate-500">Your individual share ({currentUser?.name || 'You'})</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        {personalPct}% Used
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Personal Share</span>
                        <span className="font-extrabold text-slate-900 text-sm">{personalBudgetDual.primary}</span>
                        <span className="text-[10px] text-indigo-700 font-mono block">≈ {personalBudgetDual.secondary}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Personal Remaining</span>
                        <span className="font-extrabold text-indigo-700 text-sm">{personalRemainingDual.primary}</span>
                        <span className="text-[10px] text-indigo-700 font-mono block">≈ {personalRemainingDual.secondary}</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${personalPct > 80 ? 'bg-rose-500' : 'bg-indigo-600'} transition-all`}
                        style={{ width: `${Math.min(personalPct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* =========================================================================
              CONDENSED EXPANDABLE "OTHER TRIPS" SECTION
          ========================================================================= */}
          {otherTrips.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsOtherTripsExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-2xl text-xs font-extrabold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🧳</span>
                  <span className="text-slate-900 uppercase tracking-wide">
                    Other Trips ({otherTrips.length})
                  </span>
                </div>
                <span className="text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                  {isOtherTripsExpanded ? '▲ Hide Other Trips' : '▼ Expand Other Trips'}
                </span>
              </button>

              {isOtherTripsExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {otherTrips.map((trip) => {
                    const resolvedCity = resolveCityName(trip.destination, trip.name)
                    const tripDestCurr = getTripDestinationCurrency(trip)
                    const budgetDual = formatUserDualCurrency(trip.budget || 0, userHomeCurr, userHomeCurr, tripDestCurr)
                    const spentDual = formatUserDualCurrency(trip.spent || 0, userHomeCurr, userHomeCurr, tripDestCurr)
                    const pct = Math.round((trip.spent / (trip.budget || 1)) * 100)

                    return (
                      <div
                        key={trip.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                              <img
                                src={
                                  tripImages[trip.id] ||
                                  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80'
                                }
                                alt={resolvedCity}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-slate-900 text-sm">{trip.name}</h3>
                              <p className="text-[11px] text-slate-500">📍 {resolvedCity}</p>
                              <p className="text-[10px] text-slate-400">{trip.startDate} – {trip.endDate}</p>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                            {pct}% Spent
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">Budget</span>
                            <span className="font-extrabold text-slate-900">{budgetDual.primary}</span>
                            <span className="text-[9px] text-teal-700 font-mono block">Spent: {spentDual.primary}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectTrip(trip)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition"
                            >
                              View Trip
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTrip(trip)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs transition"
                              title="Edit Trip Details"
                            >
                              ⚙️
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Action Banner */}
      <div className="bg-gradient-to-r from-[#0d9488] to-[#0284c7] rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Ready for your next adventure?</h2>
          <p className="text-teal-100 text-xs mt-1">Snap receipts. Extract items. Split bills. Track personal budgets.</p>
        </div>
        <button
          onClick={() => navigate('create-trip')}
          className="px-6 py-3 bg-white text-[#0d9488] font-bold rounded-2xl shadow-xs hover:bg-teal-50 transition-all text-sm whitespace-nowrap"
        >
          + Create New Trip
        </button>
      </div>

      {/* Edit Trip Modal */}
      {editingTrip && (
        <EditTripModal
          isOpen={Boolean(editingTrip)}
          onClose={() => setEditingTrip(null)}
          trip={editingTrip}
          onSave={(updatedTrip) => {
            onUpdateTrip?.(updatedTrip)
            setEditingTrip(null)
          }}
        />
      )}
    </div>
  )
}