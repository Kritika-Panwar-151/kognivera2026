import type { NavigateFn, User, Trip, Screen } from '../types'

interface Props {
  currentUser?: User | null
  currentTrip?: Trip | null
  currentScreen?: Screen
  navigate: NavigateFn
  onOpenConverter: () => void
  onSignOut?: () => void
}

export default function TopBar({
  currentUser,
  currentTrip,
  currentScreen,
  navigate,
  onOpenConverter,
  onSignOut,
}: Props) {
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

      {/* Right Actions: FX Calculator & User Profile / Logout */}
      <div className="flex items-center gap-2">
        {/* Global Currency Converter Button */}
        <button
          onClick={onOpenConverter}
          className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/70 text-teal-800 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
          title="Quick FX Calculator"
        >
          <span>💱</span>
          <span className="text-[11px]">FX</span>
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
