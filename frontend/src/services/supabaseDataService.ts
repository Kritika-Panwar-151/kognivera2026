import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Trip, Expense, User } from '../types'

// Baseline initial data fallback (used if Supabase env vars are not set yet)
export const initialTripsFallback: Trip[] = [
  {
    id: 'europe',
    name: 'Europe Adventure',
    destination: 'Rome & Paris, Europe',
    startDate: '12 Sep',
    endDate: '20 Sep 2026',
    currency: 'INR',
    budget: 60000,
    spent: 26172,
    adults: 3,
    children: 0,
    partySize: 3,
    members: ['usr_you', 'usr_ravi', 'usr_asha'],
    memberBudgets: {
      usr_you: 25000,
      usr_ravi: 20000,
      usr_asha: 15000,
    },
    personalBudget: 25000,
    isGroupTrip: true,
    categoryCaps: {
      accommodation: 21000,
      food: 15000,
      transport: 12000,
      activities: 6000,
      misc: 6000,
    },
  },
  {
    id: 'goa',
    name: 'Goa Getaway',
    destination: 'Goa, India',
    startDate: '2 Oct',
    endDate: '6 Oct 2026',
    currency: 'INR',
    budget: 25000,
    spent: 8420,
    adults: 2,
    children: 1,
    partySize: 3,
    members: ['usr_you', 'usr_pooja'],
    memberBudgets: {
      usr_you: 15000,
      usr_pooja: 10000,
    },
    personalBudget: 15000,
    isGroupTrip: true,
  },
]

export const initialExpensesFallback: Expense[] = [
  {
    id: '1',
    tripId: 'europe',
    merchant: 'Restaurant Milano',
    amount: 42,
    currency: 'EUR',
    convertedAmount: 3948,
    category: 'Food',
    date: '15 Sep',
    paidBy: 'You (Aisha)',
    isShared: true,
    splitBetween: ['You (Aisha)', 'Ravi', 'Asha'],
  },
  {
    id: '2',
    tripId: 'europe',
    merchant: 'Hotel Roma',
    amount: 180,
    currency: 'EUR',
    convertedAmount: 16920,
    category: 'Accommodation',
    date: '14 Sep',
    paidBy: 'Ravi',
    isShared: true,
    splitBetween: ['You (Aisha)', 'Ravi', 'Asha'],
  },
  {
    id: '3',
    tripId: 'europe',
    merchant: 'Metro Pass',
    amount: 18,
    currency: 'EUR',
    convertedAmount: 1692,
    category: 'Transport',
    date: '15 Sep',
    paidBy: 'Asha',
    isShared: true,
    splitBetween: ['You (Aisha)', 'Ravi', 'Asha'],
  },
  {
    id: '4',
    tripId: 'europe',
    merchant: 'Colosseum Guided Tour',
    amount: 35,
    currency: 'EUR',
    convertedAmount: 3290,
    category: 'Activities',
    date: '15 Sep',
    paidBy: 'You (Aisha)',
    isShared: true,
    splitBetween: ['You (Aisha)', 'Ravi', 'Asha'],
  },
  {
    id: '5',
    tripId: 'europe',
    merchant: 'Italian Leather Souvenir',
    amount: 3200,
    currency: 'INR',
    convertedAmount: 3200,
    category: 'Shopping',
    date: '16 Sep',
    paidBy: 'You (Aisha)',
    isShared: false,
    splitBetween: ['You (Aisha)'],
  },
]

// 1. Fetch Trips from Supabase
export async function fetchTripsFromSupabase(): Promise<Trip[]> {
  if (!isSupabaseConfigured) return initialTripsFallback

  try {
    const { data: rawTrips, error: tripsErr } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })

    if (tripsErr || !rawTrips || rawTrips.length === 0) {
      console.warn('Supabase fetch trips notice:', tripsErr?.message)
      return initialTripsFallback
    }

    // Fetch corresponding budgets
    const { data: rawBudgets } = await supabase.from('budgets').select('*')
    const budgetMap = new Map((rawBudgets || []).map(b => [b.trip_id, b]))

    // Fetch members for each trip
    const { data: rawMembers } = await supabase.from('trip_members').select('*')
    const memberMap = new Map<string, string[]>()
    ;(rawMembers || []).forEach(m => {
      const list = memberMap.get(m.trip_id) || []
      list.push(m.user_id)
      memberMap.set(m.trip_id, list)
    })

    // Fetch expenses to compute spent sum
    const { data: rawExpenses } = await supabase.from('expenses').select('*')
    const spentMap = new Map<string, number>()
    ;(rawExpenses || []).forEach(e => {
      const current = spentMap.get(e.trip_id) || 0
      spentMap.set(e.trip_id, current + Number(e.home_amount || 0))
    })

    return rawTrips.map(t => {
      const b = budgetMap.get(t.trip_id)
      return {
        id: t.trip_id,
        name: t.title,
        destination: t.destination_city_id || 'Destination',
        startDate: t.start_date,
        endDate: t.end_date,
        currency: t.home_currency || 'INR',
        budget: b ? Number(b.total_amount) : 50000,
        spent: spentMap.get(t.trip_id) || 0,
        adults: Number(t.adults || 1),
        children: Number(t.children || 0),
        partySize: Number(t.party_size || 1),
        members: memberMap.get(t.trip_id) || ['usr_you'],
        isGroupTrip: Boolean(t.is_group_trip),
        categoryCaps: b ? {
          accommodation: Number(b.accommodation_cap || 0),
          food: Number(b.food_cap || 0),
          transport: Number(b.transport_cap || 0),
          activities: Number(b.activities_cap || 0),
          misc: Number(b.misc_cap || 0),
        } : undefined,
      }
    })
  } catch (err) {
    console.error('Error fetching trips from Supabase:', err)
    return initialTripsFallback
  }
}

// 2. Fetch Expenses from Supabase
export async function fetchExpensesFromSupabase(tripId?: string): Promise<Expense[]> {
  if (!isSupabaseConfigured) return initialExpensesFallback

  try {
    let query = supabase.from('expenses').select('*').order('incurred_at', { ascending: false })
    if (tripId) {
      query = query.eq('trip_id', tripId)
    }

    const { data: rawExpenses, error } = await query

    if (error || !rawExpenses || rawExpenses.length === 0) {
      return initialExpensesFallback
    }

    return rawExpenses.map(e => ({
      id: e.expense_id,
      tripId: e.trip_id,
      merchant: e.description,
      amount: Number(e.amount),
      currency: e.currency,
      convertedAmount: Number(e.home_amount),
      category: e.category.charAt(0).toUpperCase() + e.category.slice(1),
      date: e.incurred_at ? new Date(e.incurred_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Today',
      paidBy: e.payer_user_id === 'usr_000000000001' || e.payer_user_id === 'usr_you' ? 'You (Aisha)' : e.payer_user_id,
      isShared: true,
      splitBetween: ['You (Aisha)', 'Ravi', 'Asha'],
    }))
  } catch (err) {
    console.error('Error fetching expenses from Supabase:', err)
    return initialExpensesFallback
  }
}

// 3. Save New Trip into Supabase
export async function saveTripToSupabase(trip: Trip, ownerUserId: string = 'usr_000000000001'): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    const tripId = trip.id.startsWith('trp_') ? trip.id : `trp_${Date.now()}`
    const now = new Date().toISOString()
    
    // Insert into trips
    const { error: tripErr } = await supabase.from('trips').insert({
      trip_id: tripId,
      owner_user_id: ownerUserId,
      title: trip.name,
      destination_city_id: 'cty_0b92e2e7', // Canonical City ID
      start_date: '2026-09-12',
      end_date: '2026-09-20',
      party_size: trip.partySize,
      adults: trip.adults,
      children: trip.children,
      trip_type: 'friends',
      is_group_trip: trip.isGroupTrip,
      status: 'planning',
      home_currency: trip.currency,
      created_at: now,
      updated_at: now,
    })

    if (tripErr) console.error('Supabase trip insert error:', tripErr.message)

    // Insert into budgets
    const { error: budErr } = await supabase.from('budgets').insert({
      budget_id: `bud_${Date.now()}`,
      trip_id: tripId,
      total_amount: trip.budget,
      currency: trip.currency,
      accommodation_cap: trip.categoryCaps?.accommodation || Math.round(trip.budget * 0.35),
      food_cap: trip.categoryCaps?.food || Math.round(trip.budget * 0.25),
      transport_cap: trip.categoryCaps?.transport || Math.round(trip.budget * 0.20),
      activities_cap: trip.categoryCaps?.activities || Math.round(trip.budget * 0.10),
      misc_cap: trip.categoryCaps?.misc || Math.round(trip.budget * 0.10),
      alert_threshold_pct: 80,
      created_at: now,
      updated_at: now,
    })

    if (budErr) console.error('Supabase budget insert error:', budErr.message)
  } catch (err) {
    console.error('Failed to save trip to Supabase:', err)
  }
}

// 4. Save New Expense into Supabase
export async function saveExpenseToSupabase(expense: Expense, payerUserId: string = 'usr_000000000001'): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    const expId = expense.id.startsWith('exp_') ? expense.id : `exp_${Date.now()}`
    const now = new Date().toISOString()
    
    const { error } = await supabase.from('expenses').insert({
      expense_id: expId,
      trip_id: expense.tripId === 'europe' ? 'trp_000000000001' : expense.tripId,
      payer_user_id: payerUserId,
      category: expense.category.toLowerCase(),
      description: expense.merchant,
      amount: expense.amount,
      currency: expense.currency,
      home_amount: expense.convertedAmount,
      home_currency: 'INR',
      fx_rate_date: '2026-09-15',
      incurred_at: now,
      entry_method: 'manual',
      is_settled: false,
      status: 'active',
      created_at: now,
      updated_at: now,
    })

    if (error) console.error('Supabase expense insert error:', error.message)
  } catch (err) {
    console.error('Failed to save expense to Supabase:', err)
  }
}
