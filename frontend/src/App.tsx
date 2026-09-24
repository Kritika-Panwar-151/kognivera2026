import { useState, useEffect } from 'react'
import type { Screen, Trip, Expense, User } from './types'
import TopBar from './components/TopBar'
import BottomNav from './components/BottomNav'
import CurrencyConverterModal from './components/CurrencyConverterModal'
import HomeScreen from './screens/HomeScreen'
import CreateTripScreen from './screens/CreateTripScreen'
import TripDashboard from './screens/TripDashboard'
import AddExpense from './screens/AddExpense'
import ReceiptScanner from './screens/ReceiptScanner'
import OCRConfirm from './screens/OCRConfirm'
import ExpenseHistory from './screens/ExpenseHistory'
import AIGuardian from './screens/AIGuardian'
import WhatIf from './screens/WhatIf'
import GroupSettlement from './screens/GroupSettlement'
import LoginScreen from './screens/LoginScreen'
import {
  fetchTripsFromSupabase,
  fetchExpensesFromSupabase,
  saveTripToSupabase,
  saveExpenseToSupabase,
  initialTripsFallback,
  initialExpensesFallback,
} from './services/supabaseDataService'
import { supabase } from './lib/supabase'

export default function App() {
  // Read persisted user session from localStorage
  const getStoredUser = (): User | null => {
    try {
      const stored = localStorage.getItem('tripwallet_auth_user')
      if (stored) return JSON.parse(stored)
    } catch (e) {
      console.warn('Failed reading stored auth user:', e)
    }
    return null
  }

  const initialUser = getStoredUser()
  const [currentUser, setCurrentUser] = useState<User | null>(initialUser)
  // First screen is LOGIN if not authenticated; otherwise DASHBOARD
  const [screen, setScreen] = useState<Screen>(initialUser ? 'trip-dashboard' : 'login')
  const [trips, setTrips] = useState<Trip[]>([])
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isConverterOpen, setIsConverterOpen] = useState(false)
  const [, setLoadingData] = useState(true)

  // Load Trips & Expenses based on logged-in user
  useEffect(() => {
    async function loadData() {
      try {
        const loadedTrips = (await fetchTripsFromSupabase()) || initialTripsFallback
        const loadedExpenses = (await fetchExpensesFromSupabase()) || initialExpensesFallback

        if (currentUser) {
          // Filter trips that belong to or include the current user
          const userTrips = loadedTrips.filter(
            (t) =>
              t.members?.includes(currentUser.id) ||
              currentUser.id === 'usr_aisha' ||
              currentUser.id === 'usr_you'
          )

          if (userTrips.length > 0) {
            setTrips(userTrips)
            setCurrentTrip(userTrips[0])
          } else {
            // Clean empty state for new users
            setTrips([])
            setCurrentTrip(null)
          }

          if (loadedExpenses && loadedExpenses.length > 0) {
            setExpenses(loadedExpenses)
          }
        } else {
          // If no user is logged in, keep state clean
          setTrips([])
          setCurrentTrip(null)
          setExpenses([])
        }
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [currentUser])

  const navigate = (s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }

  const handleUserLogin = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem('tripwallet_auth_user', JSON.stringify(user))

    // Filter or initialize trips for newly logged in user
    const userTrips = initialTripsFallback.filter(
      (t) => t.members?.includes(user.id) || user.id === 'usr_aisha'
    )

    if (userTrips.length > 0) {
      setTrips(userTrips)
      setCurrentTrip(userTrips[0])
    } else {
      // Empty state for new accounts with 0 trips
      setTrips([])
      setCurrentTrip(null)
    }

    setScreen('trip-dashboard')
  }

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('tripwallet_auth_user')
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('Sign out error:', e)
    }
    setCurrentUser(null)
    setCurrentTrip(null)
    setTrips([])
    setExpenses([])
    setScreen('login')
  }

  const handleCreateTrip = (newTrip: Trip) => {
    setTrips((prev) => [newTrip, ...prev])
    setCurrentTrip(newTrip)
    if (currentUser) {
      saveTripToSupabase(newTrip, currentUser.id)
    }
  }

  const handleAddExpense = (newExpense: Expense) => {
    setExpenses((prev) => [newExpense, ...prev])
    if (currentTrip) {
      setCurrentTrip((prev) =>
        prev
          ? {
              ...prev,
              spent: prev.spent + newExpense.convertedAmount,
            }
          : null
      )
      if (currentUser) {
        saveExpenseToSupabase(newExpense, currentUser.id)
      }
    }
  }

  const handleUpdateMemberBudget = (tripId: string, userId: string, newBudget: number) => {
    const updateTripState = (t: Trip): Trip => {
      const updatedBudgets = {
        ...(t.memberBudgets || {}),
        [userId]: newBudget,
      }
      const newTotal = Object.values(updatedBudgets).reduce((sum, b) => sum + b, 0)
      return {
        ...t,
        budget: newTotal > 0 ? newTotal : t.budget,
        memberBudgets: updatedBudgets,
        personalBudget: currentUser && userId === currentUser.id ? newBudget : t.personalBudget,
      }
    }

    setTrips((prev) => prev.map((t) => (t.id === tripId ? updateTripState(t) : t)))
    setCurrentTrip((prev) => (prev && prev.id === tripId ? updateTripState(prev) : prev))
  }

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return (
          <LoginScreen
            navigate={navigate}
            currentUser={currentUser}
            onSelectUser={handleUserLogin}
          />
        )
      case 'home':
        return (
          <HomeScreen
            navigate={navigate}
            trips={trips}
            onSelectTrip={(trip) => {
              setCurrentTrip(trip)
              navigate('trip-dashboard')
            }}
          />
        )
      case 'create-trip':
        return (
          <CreateTripScreen
            navigate={navigate}
            currentUser={currentUser || undefined}
            onCreated={handleCreateTrip}
          />
        )
      case 'trip-dashboard':
        return (
          <TripDashboard
            navigate={navigate}
            trip={currentTrip}
            expenses={expenses}
            currentUser={currentUser}
            onUpdateMemberBudget={handleUpdateMemberBudget}
          />
        )
      case 'add-expense':
        return (
          <AddExpense
            navigate={navigate}
            onAddExpense={handleAddExpense}
          />
        )
      case 'receipt-scanner':
        return <ReceiptScanner navigate={navigate} />
      case 'ocr-confirm':
        return <OCRConfirm navigate={navigate} />
      case 'expense-history':
        return (
          <ExpenseHistory
            navigate={navigate}
            expenses={expenses}
            trips={trips}
          />
        )
      case 'ai-guardian':
        return <AIGuardian navigate={navigate} />
      case 'what-if':
        return <WhatIf navigate={navigate} />
      case 'group-settlement':
        return <GroupSettlement navigate={navigate} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#f0fdfa] text-slate-800 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Mobile Top App Bar */}
      <TopBar
        currentUser={currentUser}
        currentTrip={currentTrip}
        currentScreen={screen}
        navigate={navigate}
        onOpenConverter={() => setIsConverterOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Screen Content with pb-24 for fixed bottom navigation (only when not login) */}
      <main className={`flex-1 overflow-x-hidden ${screen === 'login' ? 'pb-0' : 'pb-24'}`}>
        {renderScreen()}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar (Hidden on login screen) */}
      <BottomNav
        currentScreen={screen}
        navigate={navigate}
      />

      {/* Global Currency Converter Modal */}
      <CurrencyConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
      />
    </div>
  )
}
