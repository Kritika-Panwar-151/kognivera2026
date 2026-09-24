import { useState, useEffect, useMemo } from 'react'
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
import AdaptiveItineraryScreen from './screens/AdaptiveItineraryScreen'
import LoginScreen from './screens/LoginScreen'
import TripInviteModal from './components/TripInviteModal'
import {
  fetchTripsFromSupabase,
  fetchExpensesFromSupabase,
  saveTripToSupabase,
  saveExpenseToSupabase,
  deleteExpenseFromSupabase,
  updateExpenseInSupabase,
  updateTripDetailsInSupabase,
  acceptTripInvite,
  fetchPendingTripInvites,
  updateMemberPersonalBudgetInSupabase,
  initialTripsFallback,
  initialExpensesFallback,
} from './services/supabaseDataService'
import { enqueueOfflineAction } from './services/offlineQueueService'
import type { CategoryCaps } from './types'
import { supabase, isSupabaseConfigured } from './lib/supabase'

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
  const [pendingInviteTrips, setPendingInviteTrips] = useState<Trip[]>([])
  const [selectedInviteTrip, setSelectedInviteTrip] = useState<Trip | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Helper to filter trips strictly belonging to the logged-in user
  const filterTripsForUser = (allTrips: Trip[], user: User | null): Trip[] => {
    if (!user) return []
    return allTrips.filter((t) => {
      // 1. User is the trip owner
      if (t.ownerId === user.id) return true
      // 2. User is an active/accepted member (pending invites belong exclusively in PendingRequestsModal)
      const detail = t.memberDetails?.find((d) => d.userId === user.id)
      if (detail && (detail.status === 'active' || detail.status === 'accepted')) return true
      return false
    })
  }

  // De-duplicate trips by ID to prevent ghost duplicates
  const deduplicateTrips = (tripsList: Trip[]): Trip[] => {
    const seen = new Set<string>()
    return tripsList.filter((t) => {
      if (!t.id || seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }

  // Safe trip updater ensuring user isolation is always preserved
  const updateTripsSafely = (freshTrips: Trip[], targetUser: User | null) => {
    const userTrips = deduplicateTrips(filterTripsForUser(freshTrips, targetUser))
    
    // Preserve newly created local trips while they finish persisting to Supabase
    setTrips((prevTrips) => {
      const pendingLocalTrips = prevTrips.filter(
        (pt) => pt.id.startsWith('trp_') && !userTrips.some((ut) => ut.id === pt.id)
      )
      return deduplicateTrips([...pendingLocalTrips, ...userTrips])
    })

    setCurrentTrip((prev) => {
      if (prev) {
        const updated = userTrips.find((t) => t.id === prev.id)
        if (updated) return updated
        // If prev was just created locally and hasn't finished persisting to Supabase DB yet, KEEP prev!
        return prev
      }
      return userTrips.length > 0 ? userTrips[0] : null
    })
  }

  // Load Trips & Expenses based on logged-in user
  useEffect(() => {
    async function loadData() {
      try {
        const loadedTrips = (await fetchTripsFromSupabase()) || []
        const loadedExpenses = (await fetchExpensesFromSupabase()) || []

        if (currentUser) {
          // Check for pending trip invites for current user
          try {
            const pendingList = await fetchPendingTripInvites(currentUser.id)
            if (pendingList && pendingList.length > 0) {
              const list: Trip[] = pendingList
                .map((rec: any) => rec.trips)
                .filter(Boolean)
                .map((pTrip: any) => ({
                  id: pTrip.trip_id,
                  name: pTrip.title,
                  destination: pTrip.destination_city_id || 'Destination',
                  startDate: pTrip.start_date,
                  endDate: pTrip.end_date,
                  currency: pTrip.home_currency || 'INR',
                  budget: Number(pTrip.budget || 0),
                  spent: 0,
                  partySize: pTrip.party_size || 1,
                }))
              setPendingInviteTrips(list)
            } else {
              setPendingInviteTrips([])
            }
          } catch (e) {
            console.warn('Pending invites check error:', e)
          }

          // Strict user-filtered trips
          updateTripsSafely(loadedTrips, currentUser)

          if (loadedExpenses && loadedExpenses.length > 0) {
            setExpenses(loadedExpenses)
          } else {
            setExpenses([])
          }
        } else {
          // If no user is logged in, keep state completely clean
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

  // Realtime multi-device subscription: Pop up invites immediately & live update group budget
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured) return

    const checkInvites = async () => {
      try {
        const pendingList = await fetchPendingTripInvites(currentUser.id)
        if (pendingList && pendingList.length > 0) {
          const list: Trip[] = pendingList
            .map((rec: any) => rec.trips)
            .filter(Boolean)
            .map((pTrip: any) => ({
              id: pTrip.trip_id,
              name: pTrip.title,
              destination: pTrip.destination_city_id || 'Destination',
              startDate: pTrip.start_date,
              endDate: pTrip.end_date,
              currency: pTrip.home_currency || 'INR',
              budget: Number(pTrip.budget || 0),
              spent: 0,
              partySize: pTrip.party_size || 1,
            }))
          setPendingInviteTrips(list)
        } else {
          setPendingInviteTrips([])
        }
      } catch (e) {
        console.warn('Realtime pending invites check error:', e)
      }
    }

    // 1. Invites for current user: When someone invites this user on another device, pop up banner instantly
    const inviteChannel = supabase
      .channel(`realtime_invites_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_members',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          checkInvites()
        }
      )
      .subscribe()

    // 2. When ANY friend accepts an invite or updates membership across the trip
    const membersChannel = supabase
      .channel('realtime_all_members_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_members',
        },
        async () => {
          const freshTrips = await fetchTripsFromSupabase()
          if (freshTrips) {
            updateTripsSafely(freshTrips, currentUser)
          }
        }
      )
      .subscribe()

    // 3. When ANY user adds an expense or scans a receipt on another phone
    const expensesChannel = supabase
      .channel('realtime_all_expenses_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
        },
        async () => {
          const [freshExpenses, freshTrips] = await Promise.all([
            fetchExpensesFromSupabase(),
            fetchTripsFromSupabase(),
          ])
          if (freshExpenses) setExpenses(freshExpenses)
          if (freshTrips) {
            updateTripsSafely(freshTrips, currentUser)
          }
        }
      )
      .subscribe()

    // 4. When ANY budget or category cap updates on any device
    const budgetChannel = supabase
      .channel('realtime_budgets_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
        },
        async () => {
          const freshTrips = await fetchTripsFromSupabase()
          if (freshTrips) {
            updateTripsSafely(freshTrips, currentUser)
          }
        }
      )
      .subscribe()

    // 5. Global Instant Realtime Broadcast (Direct WebSocket messages between phones, 0 delay)
    const syncChannel = supabase.channel('global_trip_sync')
    syncChannel
      .on('broadcast', { event: '*' }, async (payload) => {
        const [freshTrips, freshExpenses] = await Promise.all([
          fetchTripsFromSupabase(),
          fetchExpensesFromSupabase(),
        ])
        if (freshTrips) {
          updateTripsSafely(freshTrips, currentUser)
        }
        if (freshExpenses) setExpenses(freshExpenses)
        checkInvites()
      })
      .subscribe()

    // 6. Live Heartbeat Sync (strictly respects current user filter)
    const syncInterval = setInterval(async () => {
      try {
        const [freshTrips, freshExpenses] = await Promise.all([
          fetchTripsFromSupabase(),
          fetchExpensesFromSupabase(),
        ])
        if (freshTrips) {
          updateTripsSafely(freshTrips, currentUser)
        }
        if (freshExpenses) {
          setExpenses(freshExpenses)
        }
        checkInvites()
      } catch (e) {
        console.warn('Sync interval error:', e)
      }
    }, 4000)

    return () => {
      clearInterval(syncInterval)
      supabase.removeChannel(inviteChannel)
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(expensesChannel)
      supabase.removeChannel(budgetChannel)
      supabase.removeChannel(syncChannel)
    }
  }, [currentUser, currentTrip?.id])

  const handleAcceptInvite = async (tripId: string, personalBudget: number, categoryCaps: CategoryCaps) => {
    if (!currentUser) return
    await acceptTripInvite(tripId, currentUser.id, personalBudget, categoryCaps)

    // Broadcast live over WebSockets so host's phone updates instantly
    if (isSupabaseConfigured) {
      supabase.channel('global_trip_sync').send({
        type: 'broadcast',
        event: 'member_joined',
        payload: { tripId, userId: currentUser.id, personalBudget },
      })
    }

    const freshTrips = await fetchTripsFromSupabase()
    updateTripsSafely(freshTrips, currentUser)
    const joined = freshTrips.find((t) => t.id === tripId)
    if (joined) {
      setCurrentTrip(joined)
    }

    setPendingInviteTrips((prev) => prev.filter((t) => t.id !== tripId))
    if (selectedInviteTrip?.id === tripId) {
      setSelectedInviteTrip(null)
      setShowInviteModal(false)
    }
  }

  const handleDeclineInvite = async (tripId: string) => {
    if (!currentUser) return
    setPendingInviteTrips((prev) => prev.filter((t) => t.id !== tripId))
    if (selectedInviteTrip?.id === tripId) {
      setSelectedInviteTrip(null)
      setShowInviteModal(false)
    }
    try {
      if (isSupabaseConfigured) {
        await supabase
          .from('trip_members')
          .update({ status: 'declined' })
          .eq('trip_id', tripId)
          .eq('user_id', currentUser.id)
      }
    } catch (e) {
      console.warn('Decline invite error:', e)
    }
  }

  const navigate = (s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }

  const handleUserLogin = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem('tripwallet_auth_user', JSON.stringify(user))

    fetchTripsFromSupabase().then((freshTrips) => {
      updateTripsSafely(freshTrips, user)
    })

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
    setTrips((prev) => deduplicateTrips([newTrip, ...prev]))
    setCurrentTrip(newTrip)
    if (currentUser) {
      saveTripToSupabase(newTrip, currentUser.id).then(() => {
        if (isSupabaseConfigured) {
          supabase.channel('global_trip_sync').send({
            type: 'broadcast',
            event: 'trip_created',
            payload: { tripId: newTrip.id, ownerId: currentUser.id, members: newTrip.members },
          })
        }
      })
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
        saveExpenseToSupabase(newExpense, currentUser.id).then(() => {
          if (isSupabaseConfigured) {
            supabase.channel('global_trip_sync').send({
              type: 'broadcast',
              event: 'expense_added',
              payload: { tripId: currentTrip.id },
            })
          }
        })
      }
    }
  }

  const handleDeleteExpense = (expenseId: string) => {
    const toDelete = expenses.find((e) => e.id === expenseId)
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
    if (toDelete && currentTrip) {
      setCurrentTrip((prev) =>
        prev
          ? {
              ...prev,
              spent: Math.max(0, prev.spent - toDelete.convertedAmount),
            }
          : null
      )
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAction('DELETE_EXPENSE', { expenseId })
    } else {
      deleteExpenseFromSupabase(expenseId).then(() => {
        if (isSupabaseConfigured && currentTrip) {
          supabase.channel('global_trip_sync').send({
            type: 'broadcast',
            event: 'expense_deleted',
            payload: { tripId: currentTrip.id, expenseId },
          })
        }
      })
    }
  }

  const handleEditExpense = (updatedExpense: Expense) => {
    const oldExpense = expenses.find((e) => e.id === updatedExpense.id)
    setExpenses((prev) => prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)))
    if (oldExpense && currentTrip) {
      const delta = updatedExpense.convertedAmount - oldExpense.convertedAmount
      setCurrentTrip((prev) =>
        prev
          ? {
              ...prev,
              spent: Math.max(0, prev.spent + delta),
            }
          : null
      )
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAction('UPDATE_EXPENSE', { expenseId: updatedExpense.id, updates: updatedExpense })
    } else {
      updateExpenseInSupabase(updatedExpense.id, updatedExpense).then(() => {
        if (isSupabaseConfigured && currentTrip) {
          supabase.channel('global_trip_sync').send({
            type: 'broadcast',
            event: 'expense_updated',
            payload: { tripId: currentTrip.id, expenseId: updatedExpense.id },
          })
        }
      })
    }
  }

  const handleUpdateTripDetails = (updatedTrip: Trip) => {
    setTrips((prev) => prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)))
    if (currentTrip && currentTrip.id === updatedTrip.id) {
      setCurrentTrip(updatedTrip)
    }
    updateTripDetailsInSupabase(updatedTrip.id, {
      name: updatedTrip.name,
      destination: updatedTrip.destination,
      budget: updatedTrip.budget,
      startDate: updatedTrip.startDate,
      endDate: updatedTrip.endDate,
    }).then(() => {
      if (isSupabaseConfigured) {
        supabase.channel('global_trip_sync').send({
          type: 'broadcast',
          event: 'trip_details_updated',
          payload: { tripId: updatedTrip.id },
        })
      }
    })
  }

  const handleUpdateMemberBudget = (tripId: string, userId: string, newBudget: number) => {
    const updateTripState = (t: Trip): Trip => {
      const updatedBudgets = {
        ...(t.memberBudgets || {}),
        [userId]: newBudget,
      }
      const newTotal = Object.values(updatedBudgets).reduce((sum, b) => sum + b, 0)
      const isCurrentUser = currentUser && userId === currentUser.id
      const effectivePersonal = isCurrentUser ? newBudget : t.personalBudget || newBudget
      const updatedCaps = {
        accommodation: Math.round(effectivePersonal * 0.35),
        food: Math.round(effectivePersonal * 0.25),
        transport: Math.round(effectivePersonal * 0.20),
        activities: Math.round(effectivePersonal * 0.10),
        misc: Math.round(effectivePersonal * 0.10),
      }
      return {
        ...t,
        budget: newTotal > 0 ? newTotal : t.budget,
        memberBudgets: updatedBudgets,
        personalBudget: isCurrentUser ? newBudget : t.personalBudget,
        categoryCaps: updatedCaps,
      }
    }

    setTrips((prev) => prev.map((t) => (t.id === tripId ? updateTripState(t) : t)))
    setCurrentTrip((prev) => (prev && prev.id === tripId ? updateTripState(prev) : prev))

    // Persist to Supabase so other phones receive the updated group budget in real time
    updateMemberPersonalBudgetInSupabase(tripId, userId, newBudget).then(() => {
      if (isSupabaseConfigured) {
        supabase.channel('global_trip_sync').send({
          type: 'broadcast',
          event: 'budget_updated',
          payload: { tripId, userId, newBudget },
        })
      }
    })
  }

  // Filter expenses strictly belonging to the currently active trip
  const currentTripExpenses = useMemo(() => {
    if (!currentTrip?.id) return []
    return expenses.filter((e) => e.tripId === currentTrip.id)
  }, [expenses, currentTrip?.id])

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
            onUpdateTrip={handleUpdateTripDetails}
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
            expenses={currentTripExpenses}
            currentUser={currentUser}
            onUpdateMemberBudget={handleUpdateMemberBudget}
            onUpdateTrip={handleUpdateTripDetails}
            onUpdateTripName={(tripId, newName) => {
              if (currentTrip && currentTrip.id === tripId) {
                handleUpdateTripDetails({ ...currentTrip, name: newName })
              }
            }}
            onDeleteExpense={handleDeleteExpense}
            onEditExpense={handleEditExpense}
          />
        )
      case 'add-expense':
        return (
          <AddExpense
            navigate={navigate}
            onAddExpense={handleAddExpense}
            trip={currentTrip}
            currentUser={currentUser}
          />
        )
      case 'receipt-scanner':
        return <ReceiptScanner navigate={navigate} />
      case 'ocr-confirm':
        return (
          <OCRConfirm
            navigate={navigate}
            onAddExpense={handleAddExpense}
            trip={currentTrip}
            currentUser={currentUser}
          />
        )
      case 'expense-history':
        return (
          <ExpenseHistory
            navigate={navigate}
            expenses={currentTripExpenses}
            trips={trips}
            onDeleteExpense={handleDeleteExpense}
            onEditExpense={handleEditExpense}
          />
        )
      case 'ai-guardian':
        return (
          <AIGuardian
            navigate={navigate}
            trip={currentTrip}
            currentUser={currentUser}
            onAddExpense={handleAddExpense}
          />
        )
      case 'what-if':
        return (
          <WhatIf
            navigate={navigate}
            trip={currentTrip}
            currentUser={currentUser}
            onAddExpense={handleAddExpense}
          />
        )
      case 'group-settlement':
        return (
          <GroupSettlement
            navigate={navigate}
            trip={currentTrip}
            expenses={currentTripExpenses}
            currentUser={currentUser}
          />
        )
      case 'adaptive-itinerary':
        return (
          <AdaptiveItineraryScreen
            navigate={navigate}
            trip={currentTrip}
            currentUser={currentUser}
          />
        )
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
        pendingInviteCount={pendingInviteTrips.length}
        pendingInviteTrips={pendingInviteTrips}
        onSelectInviteTrip={(trip) => {
          setSelectedInviteTrip(trip)
          setShowInviteModal(true)
        }}
        onDeclineInviteTrip={handleDeclineInvite}
        onOpenInviteModal={() => {
          if (pendingInviteTrips.length > 0) {
            setSelectedInviteTrip(pendingInviteTrips[0])
            setShowInviteModal(true)
          }
        }}
      />

      {/* Pending Trip Invitation Banner */}
      {pendingInviteTrips.length > 0 && screen !== 'login' && (
        <div className="max-w-4xl mx-auto px-4 pt-3 w-full">
          <div className="bg-linear-to-r from-teal-600 to-emerald-600 text-white p-3.5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-teal-400/40 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">📬</span>
              <div>
                <p className="text-xs font-bold leading-tight">
                  You have <span className="underline decoration-teal-200">{pendingInviteTrips.length} pending trip invitation{pendingInviteTrips.length > 1 ? 's' : ''}</span>!
                </p>
                <p className="text-[11px] text-teal-100">
                  {pendingInviteTrips[0].name} ({pendingInviteTrips[0].destination}) & more. Set budget & join your friends!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => handleDeclineInvite(pendingInviteTrips[0].id)}
                className="px-2.5 py-1 text-[11px] text-teal-100 hover:text-white transition"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedInviteTrip(pendingInviteTrips[0])
                  setShowInviteModal(true)
                }}
                className="px-3.5 py-1.5 bg-white text-teal-800 text-xs font-black rounded-xl shadow-xs hover:bg-teal-50 active:scale-95 transition whitespace-nowrap"
              >
                Set Budget & Join
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Trip Invite Modal */}
      {selectedInviteTrip && (
        <TripInviteModal
          trip={selectedInviteTrip}
          currentUser={currentUser}
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false)
            setSelectedInviteTrip(null)
          }}
          onAccept={handleAcceptInvite}
        />
      )}
    </div>
  )
}
