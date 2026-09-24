import { useState } from 'react'
import type { NavigateFn, User, Trip, Screen } from '../types'
import { getTripDestinationCurrency, getCurrencySymbol } from '../services/currencyService'

interface Props {
  currentUser?: User | null
  currentTrip?: Trip | null
  currentScreen?: Screen
  navigate: NavigateFn
  onOpenConverter: () => void
  onSignOut?: () => void
  pendingInviteCount?: number
  pendingInviteTrips?: Trip[]
  onSelectInviteTrip?: (trip: Trip) => void
  onDeclineInviteTrip?: (tripId: string) => void
  onOpenInviteModal?: () => void
}

export default function TopBar({
  currentUser,
  currentTrip,
  currentScreen,
  navigate,
  onOpenConverter,
  onSignOut,
  pendingInviteCount = 0,
  pendingInviteTrips = [],
  onSelectInviteTrip,
  onDeclineInviteTrip,
  onOpenInviteModal,
}: Props) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const homeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const homeSym = getCurrencySymbol(homeCurr).trim()
  const activeCurr = getTripDestinationCurrency(currentTrip)
  const activeSym = getCurrencySymbol(activeCurr).trim()

  // Hide TopBar completely on login screen for full immersion
  if (currentScreen === 'login') return null

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-teal-100/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
      {/* Brand & Active Trip */}
      <div
        onClick={() => navigate('trip-dashboard')}
        className="flex items-center gap-2.5 cursor-pointer"
      >
        <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center text-white text-base shadow-xs">
          🧳
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 text-sm leading-none">
              TripWallet
            </span>
            {currentTrip ? (
              <span className="bg-teal-50 text-teal-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-teal-200/60 truncate max-w-[120px]">
                {currentTrip.name}
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-500 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                No active trip
              </span>
            )}
          </div>
          <p className="text-[10px] text-teal-600 font-medium">Smart Travel Finance</p>
        </div>
      </div>

      {/* Right Actions: Pending Invites, FX Calculator & User Profile / Logout */}
      <div className="flex items-center gap-2 relative">
        {/* Pending Trip Invite Badge Button & Interactive Dropdown */}
        {pendingInviteCount > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm animate-pulse cursor-pointer"
              title="You have pending trip invitations! Tap to view requests"
            >
              <span className="text-sm">🎉</span>
              <span className="text-[11px] font-extrabold whitespace-nowrap">
                {pendingInviteCount} Invite{pendingInviteCount > 1 ? 's' : ''}
              </span>
              <span className="text-[10px]">▼</span>
            </button>

            {/* Dropdown Menu listing all pending trip requests */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-11 w-80 bg-white border border-amber-200 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <span>📬 Pending Requests</span>
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.2 rounded-full text-[10px]">
                      {pendingInviteTrips.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pendingInviteTrips.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No pending invitations.</p>
                  ) : (
                    pendingInviteTrips.map((pTrip) => (
                      <div
                        key={pTrip.id}
                        className="p-2.5 bg-slate-50 hover:bg-teal-50/50 border border-slate-200 rounded-xl space-y-2 transition"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900 leading-tight">{pTrip.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            📍 {pTrip.destination} · {pTrip.startDate}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsDropdownOpen(false)
                              if (onDeclineInviteTrip) onDeclineInviteTrip(pTrip.id)
                            }}
                            className="flex-1 py-1 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-lg transition text-center"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsDropdownOpen(false)
                              if (onSelectInviteTrip) onSelectInviteTrip(pTrip)
                            }}
                            className="flex-1 py-1 px-2 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black rounded-lg transition text-center shadow-2xs"
                          >
                            Set Budget & Join
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dedicated AI Guardian Copilot Button */}
        <button
          type="button"
          onClick={() => navigate('ai-guardian')}
          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
            currentScreen === 'ai-guardian'
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
              : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200'
          }`}
          title="Open AI Travel Guardian & Copilot"
        >
          <span className="text-sm">🤖</span>
          <span className="hidden sm:inline">AI Guardian</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </button>

        {/* Global Unified Currency Pill & Converter Button */}
        <button
          type="button"
          onClick={onOpenConverter}
          className="px-2.5 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 border border-teal-200/80 text-teal-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          title={`Home Currency: ${homeCurr} (${homeSym}) — Tap for FX Converter`}
        >
          <span className="text-xs">💱</span>
          <span className="text-[11px] font-black text-teal-800 tracking-tight">
            {homeCurr} ({homeSym})
          </span>
        </button>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 py-1 px-2 rounded-xl">
          <div className="w-6 h-6 bg-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-2xs">
            {currentUser?.avatar || '👤'}
          </div>
          <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[90px] truncate">
            {currentUser?.name?.split(' ')[0] || 'Account'}
          </span>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="text-[10px] text-slate-400 hover:text-rose-600 font-bold ml-1 transition"
              title="Sign Out"
            >
              Exit
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
