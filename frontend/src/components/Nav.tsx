import type { Screen, NavigateFn, User, Trip } from '../types'

interface NavProps {
  currentScreen: Screen
  navigate: NavigateFn
  currentUser?: User
  currentTrip?: Trip
  onOpenConverter: () => void
}

const dashboardScreens: Screen[] = ['trip-dashboard']
const tripsScreens: Screen[] = ['home', 'create-trip']
const expensesScreens: Screen[] = [
  'expense-history',
  'add-expense',
  'receipt-scanner',
  'ocr-confirm',
]
const guardianScreens: Screen[] = ['ai-guardian', 'what-if']

function isActive(screens: Screen[], current: Screen) {
  return screens.includes(current)
}

export default function Nav({
  currentScreen,
  navigate,
  currentUser,
  currentTrip,
  onOpenConverter,
}: NavProps) {
  const pct = currentTrip ? Math.round((currentTrip.spent / currentTrip.budget) * 100) : 44

  return (
    <nav
      className="
        w-16 md:w-60
        bg-white
        border-r border-teal-100
        flex flex-col
        shrink-0
        h-full
      "
    >
      {/* LOGO */}
      <div className="p-3 md:p-5 border-b border-gray-100">
        <div
          onClick={() => navigate('home')}
          className="flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-lg">
            🧳
          </div>

          <div className="hidden md:block">
            <div className="font-bold text-[#164e63] text-base leading-tight">
              TripWallet
            </div>
            <div className="text-[11px] text-teal-600 font-medium leading-tight">
              Smart Travel Fintech
            </div>
          </div>
        </div>
      </div>

      {/* MENU */}
      <div className="flex-1 p-2 md:p-3 overflow-y-auto space-y-1">
        <p className="hidden md:block text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-1">
          Menu
        </p>

        <NavItem
          label="Dashboard"
          active={isActive(dashboardScreens, currentScreen)}
          onClick={() => navigate('trip-dashboard')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          }
        />

        <NavItem
          label="My Trips"
          active={isActive(tripsScreens, currentScreen)}
          onClick={() => navigate('home')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          }
        />

        <NavItem
          label="Expenses"
          active={isActive(expensesScreens, currentScreen)}
          onClick={() => navigate('expense-history')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2V4a2 2 0 0 0-2-2z" />
              <path d="M9 9h6M9 13h6M9 17h2" />
            </svg>
          }
        />

        <NavItem
          label="AI Guardian"
          active={isActive(guardianScreens, currentScreen)}
          onClick={() => navigate('ai-guardian')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
              <path d="M5.5 17.5l.75 2.25L8.5 20.5l-2.25.75L5.5 23.5l-.75-2.25L2.5 20.5l2.25-.75L5.5 17.5z" />
            </svg>
          }
        />

        <NavItem
          label="Settlement"
          active={currentScreen === 'group-settlement'}
          onClick={() => navigate('group-settlement')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />

        {/* GLOBAL FEATURE: CURRENCY CONVERTER */}
        <div className="pt-2">
          <button
            onClick={onOpenConverter}
            className="w-full flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200/70 transition"
          >
            <span className="text-base">💱</span>
            <span className="hidden md:inline">FX Converter</span>
          </button>
        </div>

        {/* CURRENT TRIP WIDGET */}
        {currentTrip && (
          <div className="hidden md:block pt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Current Trip
            </p>

            <div
              onClick={() => navigate('trip-dashboard')}
              className="mx-1 p-3 bg-teal-50/80 rounded-2xl border border-teal-100 hover:border-teal-300 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-teal-900 truncate">
                  {currentTrip.name}
                </span>
              </div>

              <div className="text-[11px] text-teal-700 font-medium">
                {currentTrip.startDate} – {currentTrip.endDate}
              </div>

              <div className="mt-2">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-teal-600 font-medium">Budget used</span>
                  <span className="text-teal-900 font-bold">{pct}%</span>
                </div>
                <div className="w-full bg-teal-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-1.5 rounded-full bg-teal-600" style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* USER PROFILE / LOGIN SWITCHER */}
      <div className="p-2 md:p-3 border-t border-gray-100">
        <button
          onClick={() => navigate('login')}
          className="w-full flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2.5 rounded-xl hover:bg-teal-50 transition-colors group"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
            {currentUser?.avatar || '👤'}
          </div>

          <div className="hidden md:block text-left min-w-0 flex-1">
            <div className="text-xs font-bold text-gray-900 truncate group-hover:text-teal-800">
              {currentUser?.name || 'Aisha Rossi'}
            </div>
            <div className="text-[10px] text-gray-400 truncate">
              Switch Account ⇄
            </div>
          </div>
        </button>
      </div>
    </nav>
  )
}

function NavItem({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`
        w-full
        flex items-center
        justify-center md:justify-start
        gap-3
        px-2 md:px-3
        py-2.5
        rounded-xl
        text-xs
        font-semibold
        transition-all
        ${
          active
            ? 'bg-teal-600 text-white shadow-xs'
            : 'text-gray-600 hover:bg-teal-50 hover:text-teal-700'
        }
      `}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  )
}