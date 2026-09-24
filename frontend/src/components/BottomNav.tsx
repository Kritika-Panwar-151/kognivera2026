import type { Screen, NavigateFn } from '../types'

interface Props {
  currentScreen: Screen
  navigate: NavigateFn
}

const dashboardScreens: Screen[] = ['trip-dashboard']
const tripsScreens: Screen[] = ['home', 'create-trip']
const expensesScreens: Screen[] = [
  'expense-history',
  'add-expense',
  'receipt-scanner',
  'ocr-confirm',
]
const guardianScreens: Screen[] = ['ai-guardian', 'what-if', 'adaptive-itinerary']

export default function BottomNav({ currentScreen, navigate }: Props) {
  if (currentScreen === 'login') return null

  const isDashboard = dashboardScreens.includes(currentScreen)
  const isTrips = tripsScreens.includes(currentScreen)
  const isExpenses = expensesScreens.includes(currentScreen)
  const isGuardian = guardianScreens.includes(currentScreen)
  const isSettlement = currentScreen === 'group-settlement'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-teal-100 shadow-[0_-4px_25px_rgba(0,0,0,0.06)]">
      <div className="max-w-lg mx-auto px-2 py-1 flex items-center justify-around">
        {/* TAB 1: DASHBOARD */}
        <button
          onClick={() => navigate('trip-dashboard')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
            isDashboard ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {isDashboard && (
            <span className="absolute -top-1 w-8 h-1 bg-teal-600 rounded-full animate-in fade-in" />
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isDashboard ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span className="text-[10px] mt-0.5 tracking-tight">Dashboard</span>
        </button>

        {/* TAB 2: MY TRIPS */}
        <button
          onClick={() => navigate('home')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
            isTrips ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {isTrips && (
            <span className="absolute -top-1 w-8 h-1 bg-teal-600 rounded-full animate-in fade-in" />
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isTrips ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          <span className="text-[10px] mt-0.5 tracking-tight">Trips</span>
        </button>

        {/* TAB 3: EXPENSES */}
        <button
          onClick={() => navigate('expense-history')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
            isExpenses ? 'text-teal-700 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {isExpenses && (
            <span className="absolute -top-1 w-8 h-1 bg-teal-600 rounded-full animate-in fade-in" />
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isExpenses ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2V4a2 2 0 0 0-2-2z" />
            <path d="M9 9h6M9 13h6M9 17h2" />
          </svg>
          <span className="text-[10px] mt-0.5 tracking-tight">Expenses</span>
        </button>

        {/* TAB 4: AI GUARDIAN */}
        <button
          onClick={() => navigate('ai-guardian')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
            isGuardian ? 'text-orange-600 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {isGuardian && (
            <span className="absolute -top-1 w-8 h-1 bg-orange-500 rounded-full animate-in fade-in" />
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isGuardian ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
            <path d="M5.5 17.5l.75 2.25L8.5 20.5l-2.25.75L5.5 23.5l-.75-2.25L2.5 20.5l2.25-.75L5.5 17.5z" />
          </svg>
          <span className="text-[10px] mt-0.5 tracking-tight">Guardian</span>
        </button>

        {/* TAB 5: SETTLEMENT */}
        <button
          onClick={() => navigate('group-settlement')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
            isSettlement ? 'text-indigo-700 font-bold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {isSettlement && (
            <span className="absolute -top-1 w-8 h-1 bg-indigo-600 rounded-full animate-in fade-in" />
          )}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isSettlement ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-[10px] mt-0.5 tracking-tight">Settle</span>
        </button>
      </div>
    </nav>
  )
}
