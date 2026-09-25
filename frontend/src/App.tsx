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
import { syncActiveCurrencies, getTripDestinationCurrency, convertCurrency, isTripMatch, deduplicateExpenses } from './services/currencyService'
import { isUserMatch, getRegisteredUsers } from './services/userRegistry'

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

  const getStoredTrips = (user: User | null): Trip[] => {
    if (!user) return []
    try {
      const stored = localStorage.getItem(`tripwallet_user_trips_${user.id}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Failed reading stored trips:', e)
    }
    return []
  }

  const getStoredActiveTrip = (tripsList: Trip[]): Trip | null => {
    try {
      const activeId = localStorage.getItem('tripwallet_active_trip_id')
      if (activeId) {
        const found = tripsList.find((t) => t.id === activeId)
        if (found) return found
      }
    } catch (e) {
      console.warn('Failed reading active trip id:', e)
    }
    return tripsList.length > 0 ? tripsList[0] : null
  }

  const getStoredScreen = (user: User | null): Screen => {
    try {
      const stored = localStorage.getItem('tripwallet_current_screen')
      if (stored && stored !== 'login') return stored as Screen
    } catch (e) {
      console.warn('Failed reading current screen:', e)
    }
    return user ? 'trip-dashboard' : 'login'
  }

  const getStoredExpenses = (user: User | null): Expense[] => {
    if (!user) return []
    try {
      const stored = localStorage.getItem(`tripwallet_user_expenses_${user.id}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn('Failed reading stored expenses:', e)
    }
    return []
  }

  const initialUser = getStoredUser()
  const initialTrips = getStoredTrips(initialUser)
  const initialCurrentTrip = getStoredActiveTrip(initialTrips)
  const initialScreen = getStoredScreen(initialUser)
  const initialExpenses = getStoredExpenses(initialUser)

  const [currentUser, setCurrentUser] = useState<User | null>(initialUser)
  const [screen, setScreenState] = useState<Screen>(initialScreen)
  const [trips, setTrips] = useState<Trip[]>(initialTrips)
  const [currentTrip, setCurrentTripState] = useState<Trip | null>(initialCurrentTrip)
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [isConverterOpen, setIsConverterOpen] = useState(false)
  const [, setLoadingData] = useState(true)
  const [pendingInviteTrips, setPendingInviteTrips] = useState<Trip[]>([])
  const [selectedInviteTrip, setSelectedInviteTrip] = useState<Trip | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Sync active trip ID, user trips, and expenses to localStorage per user
  useEffect(() => {
    if (currentUser && trips) {
      try {
        localStorage.setItem(`tripwallet_user_trips_${currentUser.id}`, JSON.stringify(trips))
      } catch (e) {
        console.warn('Failed saving trips to localStorage:', e)
      }
    }
  }, [trips, currentUser])

  useEffect(() => {
    if (currentUser && expenses) {
      try {
        localStorage.setItem(`tripwallet_user_expenses_${currentUser.id}`, JSON.stringify(expenses))
      } catch (e) {
        console.warn('Failed saving expenses to localStorage:', e)
      }
    }
  }, [expenses, currentUser])

  useEffect(() => {
    if (currentTrip?.id) {
      try {
        localStorage.setItem('tripwallet_active_trip_id', currentTrip.id)
      } catch (e) {
        console.warn('Failed saving active trip id to localStorage:', e)
      }
    }
  }, [currentTrip?.id])

  // Globally sync active destination currency + symbol and home currency + symbol
  useEffect(() => {
    const active = currentTrip || (trips.length > 0 ? trips[0] : null)
    syncActiveCurrencies(active, currentUser)
  }, [currentTrip, currentUser, trips])

  // Helper to filter trips strictly belonging to the logged-in user
  const filterTripsForUser = (allTrips: Trip[], user: User | null): Trip[] => {
    if (!user) return []
    return allTrips.filter((t) => {
      // 1. User is the trip owner
      if (t.ownerId === user.id || isUserMatch(t.ownerId, user)) return true

      // 2. User is an active/accepted member
      const detail = t.memberDetails?.find((d) => isUserMatch(d.userId, user))
      if (detail && (detail.status === 'active' || (detail.status as string) === 'accepted')) return true

      const isDirectMember = t.members && t.members.some((m) => isUserMatch(m, user))
      if (isDirectMember) {
        if (detail && detail.status === 'pending') return false
        return true
      }

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

  // Safe trip updater ensuring user isolation is always preserved while keeping local budget edits intact
  const updateTripsSafely = (freshTrips: Trip[], targetUser: User | null) => {
    if (!targetUser) {
      setTrips([])
      setCurrentTripState(null)
      return
    }

    const userTrips = deduplicateTrips(filterTripsForUser(freshTrips, targetUser))
    
    setTrips((prevTrips) => {
      const mergedTrips = userTrips.map((ut) => {
        const localMatch = prevTrips.find((pt) => pt.id === ut.id)
        if (!localMatch) return ut

        const localBudget = localMatch.budget || 0
        const dbBudget = ut.budget || 0
        const effectiveBudget = localBudget > 0 ? localBudget : dbBudget

        const mergedMemberBudgets = {
          ...(ut.memberBudgets || {}),
          ...(localMatch.memberBudgets || {}),
        }
        const mergedCaps =
          localMatch.categoryCaps && Object.keys(localMatch.categoryCaps).length > 0
            ? localMatch.categoryCaps
            : ut.categoryCaps

        return {
          ...ut,
          budget: effectiveBudget,
          personalBudget: localMatch.personalBudget ?? ut.personalBudget,
          memberBudgets: mergedMemberBudgets,
          categoryCaps: mergedCaps,
        }
      })

      const pendingLocalTrips = prevTrips.filter(
        (pt) => (pt.ownerId === targetUser.id || isUserMatch(pt.ownerId, targetUser)) && !mergedTrips.some((ut) => ut.id === pt.id)
      )
      const merged = deduplicateTrips([...mergedTrips, ...pendingLocalTrips])
      try {
        localStorage.setItem(`tripwallet_user_trips_${targetUser.id}`, JSON.stringify(merged))
      } catch (e) {}

      setCurrentTripState((prev) => {
        if (prev && merged.some((t) => t.id === prev.id)) {
          return merged.find((t) => t.id === prev.id) || null
        }
        return merged.length > 0 ? merged[0] : null
      })

      return merged
    })
  }

  // Safe expense merger ensuring DB sync never clears local expenses when DB returns empty array
  const mergeExpensesSafely = (freshExpenses: Expense[]) => {
    setExpenses((prev) => {
      const dbIds = new Set((freshExpenses || []).map((e) => e.id))
      const localOnly = prev.filter((e) => !dbIds.has(e.id))
      const combined = [...(freshExpenses || []), ...localOnly]
      const deduped = deduplicateExpenses(combined)
      if (currentUser) {
        try {
          localStorage.setItem(`tripwallet_user_expenses_${currentUser.id}`, JSON.stringify(deduped))
        } catch (e) {}
      }
      return deduped
    })
  }

  // Load Trips & Expenses based on logged-in user
  useEffect(() => {
    async function loadData() {
      try {
        const loadedTrips = (await fetchTripsFromSupabase(currentUser?.id)) || []
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

          const allUserTrips = filterTripsForUser([...trips, ...loadedTrips], currentUser)
          const userTripIds = new Set(allUserTrips.map((t) => t.id))

          const normalized = (loadedExpenses || [])
            .filter((e) => !e.tripId || userTripIds.has(e.tripId) || (currentTrip?.id && isTripMatch(e.tripId, currentTrip.id)))
            .map((e) => {
              const origCurr = (e.currency || 'INR').toUpperCase()
              const destCurr = getTripDestinationCurrency(currentTrip)
              const destConv = convertCurrency(e.amount || 0, origCurr, destCurr)
              return {
                ...e,
                convertedAmount: e.convertedAmount && e.convertedAmount > 0 ? e.convertedAmount : (destConv > 0 ? destConv : (e.amount || 0)),
              }
            })

          mergeExpensesSafely(normalized)
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
          if (freshExpenses && freshExpenses.length > 0) {
            mergeExpensesSafely(freshExpenses)
          }
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
        const p = payload.payload
        if (p?.tripId && p?.userId) {
          const joinedId = p.userId
          const joinedBudget = Number(p.personalBudget || 0)
          setTrips((prev) =>
            prev.map((t) => {
              if (t.id === p.tripId) {
                const members = Array.from(new Set([...(t.members || []), joinedId]))
                const details = t.memberDetails || []
                const foundUser = getRegisteredUsers().find((u) => u.id === joinedId || isUserMatch(joinedId, u))
                const hasDetail = details.some((d) => isUserMatch(d.userId, foundUser || { id: joinedId, name: '', homeCurrency: 'INR' }))
                const updatedDetails = hasDetail
                  ? details.map((d) =>
                      isUserMatch(d.userId, foundUser || { id: joinedId, name: '', homeCurrency: 'INR' })
                        ? { ...d, status: 'active' as const, personalBudget: joinedBudget }
                        : d
                    )
                  : [
                      ...details,
                      { userId: joinedId, role: 'editor' as const, status: 'active' as const, personalBudget: joinedBudget },
                    ]
                const memberBudgets = {
                  ...(t.memberBudgets || {}),
                  [joinedId]: joinedBudget,
                }
                const sumBudgets = (Object.values(memberBudgets) as number[]).reduce((sum, v) => sum + (v || 0), 0)
                return {
                  ...t,
                  members,
                  memberDetails: updatedDetails,
                  memberBudgets,
                  budget: Math.max(t.budget || 0, sumBudgets),
                  isGroupTrip: members.length > 1,
                }
              }
              return t
            })
          )
        }

        const [freshTrips, freshExpenses] = await Promise.all([
          fetchTripsFromSupabase(),
          fetchExpensesFromSupabase(),
        ])
        if (freshTrips) {
          updateTripsSafely(freshTrips, currentUser)
        }
        if (freshExpenses && freshExpenses.length > 0) {
          mergeExpensesSafely(freshExpenses)
        }
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
        if (freshTrips && freshTrips.length > 0) {
          updateTripsSafely(freshTrips, currentUser)
        }
        if (freshExpenses && freshExpenses.length > 0) {
          mergeExpensesSafely(freshExpenses)
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

    // 1. Optimistic Local State Update so UI updates instantly
    setTrips((prevTrips) => {
      const exists = prevTrips.some((t) => t.id === tripId)
      let updated: Trip[] = []
      const sourceTrip = prevTrips.find((t) => t.id === tripId) || selectedInviteTrip || pendingInviteTrips.find((t) => t.id === tripId)

      if (!sourceTrip) return prevTrips

      const updatedMembers = Array.from(new Set([...(sourceTrip.members || []), currentUser.id]))
      const existingDetails = sourceTrip.memberDetails || []
      const hasDetail = existingDetails.some((d) => isUserMatch(d.userId, currentUser))
      const updatedDetails = hasDetail
        ? existingDetails.map((d) =>
            isUserMatch(d.userId, currentUser)
              ? { ...d, status: 'active' as const, personalBudget, categoryCaps }
              : d
          )
        : [
            ...existingDetails,
            { userId: currentUser.id, role: 'editor' as const, status: 'active' as const, personalBudget, categoryCaps },
          ]
      const updatedMemberBudgets = {
        ...(sourceTrip.memberBudgets || {}),
        [currentUser.id]: personalBudget,
      }
      const sumMemberBudgets = Object.values(updatedMemberBudgets).reduce((sum, v) => sum + v, 0)
      const newBudget = Math.max(sourceTrip.budget || 0, sumMemberBudgets)

      const acceptedTripObj: Trip = {
        ...sourceTrip,
        members: updatedMembers,
        memberDetails: updatedDetails,
        memberBudgets: updatedMemberBudgets,
        personalBudget,
        budget: newBudget,
        isGroupTrip: updatedMembers.length > 1,
      }

      if (exists) {
        updated = prevTrips.map((t) => (t.id === tripId ? acceptedTripObj : t))
      } else {
        updated = [acceptedTripObj, ...prevTrips]
      }

      try {
        localStorage.setItem(`tripwallet_user_trips_${currentUser.id}`, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })

    // Also update current trip state if matching or set active
    setCurrentTripState((prev) => {
      const targetTrip = trips.find((t) => t.id === tripId) || selectedInviteTrip || pendingInviteTrips.find((t) => t.id === tripId) || prev
      if (targetTrip) {
        const updatedMembers = Array.from(new Set([...(targetTrip.members || []), currentUser.id]))
        const existingDetails = targetTrip.memberDetails || []
        const hasDetail = existingDetails.some((d) => isUserMatch(d.userId, currentUser))
        const updatedDetails = hasDetail
          ? existingDetails.map((d) =>
              isUserMatch(d.userId, currentUser)
                ? { ...d, status: 'active' as const, personalBudget, categoryCaps }
                : d
            )
          : [
              ...existingDetails,
              { userId: currentUser.id, role: 'editor' as const, status: 'active' as const, personalBudget, categoryCaps },
            ]
        const updatedMemberBudgets = {
          ...(targetTrip.memberBudgets || {}),
          [currentUser.id]: personalBudget,
        }
        const sumMemberBudgets = Object.values(updatedMemberBudgets).reduce((sum, v) => sum + v, 0)
        return {
          ...targetTrip,
          members: updatedMembers,
          memberDetails: updatedDetails,
          memberBudgets: updatedMemberBudgets,
          personalBudget,
          budget: Math.max(targetTrip.budget || 0, sumMemberBudgets),
          isGroupTrip: updatedMembers.length > 1,
        }
      }
      return prev
    })

    setPendingInviteTrips((prev) => prev.filter((t) => t.id !== tripId))
    if (selectedInviteTrip?.id === tripId) {
      setSelectedInviteTrip(null)
      setShowInviteModal(false)
    }

    // 2. Persist to Supabase
    await acceptTripInvite(tripId, currentUser.id, personalBudget, categoryCaps)

    // Broadcast live over WebSockets so host's phone updates instantly
    if (isSupabaseConfigured) {
      supabase.channel('global_trip_sync').send({
        type: 'broadcast',
        event: 'member_joined',
        payload: { tripId, userId: currentUser.id, personalBudget },
      })
    }

    // 3. Fetch fresh trips from DB
    const freshTrips = await fetchTripsFromSupabase()
    if (freshTrips && freshTrips.length > 0) {
      updateTripsSafely(freshTrips, currentUser)
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
    setScreenState(s)
    try {
      localStorage.setItem('tripwallet_current_screen', s)
    } catch (e) {
      console.warn('Error saving current screen:', e)
    }
    window.scrollTo(0, 0)
  }

  const setCurrentTrip = (t: Trip | null) => {
    setCurrentTripState(t)
    if (t?.id) {
      try {
        localStorage.setItem('tripwallet_active_trip_id', t.id)
      } catch (e) {
        console.warn('Error saving active trip id:', e)
      }
    }
  }

  const handleUserLogin = (user: User) => {
    setCurrentUser(user)
    try {
      localStorage.setItem('tripwallet_auth_user', JSON.stringify(user))
    } catch (e) {
      console.warn('Error saving auth user:', e)
    }

    const initialUserTrips = getStoredTrips(user)
    setTrips(initialUserTrips)
    setCurrentTripState(initialUserTrips.length > 0 ? initialUserTrips[0] : null)
    setExpenses([])

    fetchTripsFromSupabase().then((freshTrips) => {
      updateTripsSafely(freshTrips, user)
    })

    navigate('trip-dashboard')
  }

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('tripwallet_auth_user')
      localStorage.removeItem('tripwallet_user_trips')
      localStorage.removeItem('tripwallet_active_trip_id')
      localStorage.removeItem('tripwallet_current_screen')
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('Sign out error:', e)
    }
    setCurrentUser(null)
    setCurrentTripState(null)
    setTrips([])
    setExpenses([])
    setScreenState('login')
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
    setExpenses((prev) => deduplicateExpenses([newExpense, ...prev]))
    setTrips((prev) =>
      prev.map((t) =>
        isTripMatch(t.id, newExpense.tripId) || (currentTrip && t.id === currentTrip.id)
          ? { ...t, spent: Math.round((t.spent || 0) + (newExpense.convertedAmount || newExpense.amount || 0)) }
          : t
      )
    )
    if (currentTrip) {
      setCurrentTripState((prev) =>
        prev
          ? {
              ...prev,
              spent: Math.round((prev.spent || 0) + (newExpense.convertedAmount || newExpense.amount || 0)),
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
      setCurrentTripState((prev) =>
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
      setCurrentTripState((prev) =>
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
      const targetCapsBase = t.isGroupTrip && newTotal > 0 ? newTotal : effectivePersonal
      const updatedCaps = {
        accommodation: Math.round(targetCapsBase * 0.35),
        food: Math.round(targetCapsBase * 0.25),
        transport: Math.round(targetCapsBase * 0.20),
        activities: Math.round(targetCapsBase * 0.10),
        misc: Math.round(targetCapsBase * 0.10),
      }
      return {
        ...t,
        budget: newTotal > 0 ? newTotal : (t.budget || newBudget),
        memberBudgets: updatedBudgets,
        personalBudget: isCurrentUser ? newBudget : t.personalBudget,
        categoryCaps: updatedCaps,
      }
    }

    setTrips((prev) => prev.map((t) => (t.id === tripId ? updateTripState(t) : t)))
    setCurrentTripState((prev) => (prev && prev.id === tripId ? updateTripState(prev) : prev))

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
    if (!currentTrip?.id) return expenses
    return expenses.filter((e) => isTripMatch(e.tripId, currentTrip.id))
  }, [expenses, currentTrip?.id])

  const activeTrip = currentTrip || (trips.length > 0 ? trips[0] : null)

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
            currentUser={currentUser}
            expenses={expenses}
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
            trip={activeTrip}
            expenses={currentTripExpenses}
            currentUser={currentUser}
            onUpdateMemberBudget={handleUpdateMemberBudget}
            onUpdateTrip={handleUpdateTripDetails}
            onUpdateTripName={(tripId, newName) => {
              if (activeTrip && activeTrip.id === tripId) {
                handleUpdateTripDetails({ ...activeTrip, name: newName })
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
            trip={activeTrip}
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
            trip={activeTrip}
            currentUser={currentUser}
          />
        )
      case 'expense-history':
        return (
          <ExpenseHistory
            navigate={navigate}
            expenses={currentTripExpenses}
            trips={trips}
            currentUser={currentUser}
            onDeleteExpense={handleDeleteExpense}
            onEditExpense={handleEditExpense}
          />
        )
      case 'ai-guardian':
        return (
          <AIGuardian
            navigate={navigate}
            trip={activeTrip}
            currentUser={currentUser}
            onAddExpense={handleAddExpense}
          />
        )
      case 'what-if':
        return (
          <WhatIf
            navigate={navigate}
            trip={activeTrip}
            currentUser={currentUser}
            onAddExpense={handleAddExpense}
          />
        )
      case 'group-settlement':
        return (
          <GroupSettlement
            navigate={navigate}
            trip={activeTrip}
            expenses={currentTripExpenses}
            currentUser={currentUser}
          />
        )
      case 'adaptive-itinerary':
        return (
          <AdaptiveItineraryScreen
            navigate={navigate}
            trip={activeTrip}
            currentUser={currentUser}
          />
        )
      default:
        return currentUser ? (
          <TripDashboard
            navigate={navigate}
            trip={activeTrip}
            expenses={currentTripExpenses}
            currentUser={currentUser}
            onUpdateMemberBudget={handleUpdateMemberBudget}
            onUpdateTrip={handleUpdateTripDetails}
            onDeleteExpense={handleDeleteExpense}
            onEditExpense={handleEditExpense}
          />
        ) : (
          <LoginScreen
            navigate={navigate}
            currentUser={currentUser}
            onSelectUser={handleUserLogin}
          />
        )
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
        defaultHomeCurrency={currentUser?.homeCurrency || 'INR'}
        defaultTripCurrency={getTripDestinationCurrency(currentTrip || (trips.length > 0 ? trips[0] : null))}
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
