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

    // Fetch members for each trip with personal_budget and category_caps
    const { data: rawMembers } = await supabase.from('trip_members').select('*')
    const memberMap = new Map<string, string[]>()
    const memberDetailsMap = new Map<string, any[]>()
    const memberBudgetsMap = new Map<string, Record<string, number>>()

    ;(rawMembers || []).forEach((m) => {
      const list = memberMap.get(m.trip_id) || []
      list.push(m.user_id)
      memberMap.set(m.trip_id, list)

      const details = memberDetailsMap.get(m.trip_id) || []
      details.push({
        userId: m.user_id,
        role: m.role || 'editor',
        status: m.status || 'active',
        personalBudget: Number(m.personal_budget || 0),
        categoryCaps: m.category_caps || {},
        invitedByUserId: m.invited_by_user_id,
      })
      memberDetailsMap.set(m.trip_id, details)

      const bMap = memberBudgetsMap.get(m.trip_id) || {}
      bMap[m.user_id] = Number(m.personal_budget || 0)
      memberBudgetsMap.set(m.trip_id, bMap)
    })

    // Fetch expenses to compute spent sum
    const { data: rawExpenses } = await supabase.from('expenses').select('*')
    const spentMap = new Map<string, number>()
    ;(rawExpenses || []).forEach((e) => {
      const current = spentMap.get(e.trip_id) || 0
      spentMap.set(e.trip_id, current + Number(e.home_amount || 0))
    })

    return rawTrips.map((t) => {
      const b = budgetMap.get(t.trip_id)
      const membersForTrip = memberDetailsMap.get(t.trip_id) || []
      const activeMembers = membersForTrip.filter((m) => m.status === 'active')

      // Group budget is the sum of personal budgets of all active members
      const aggregatedGroupBudget =
        activeMembers.length > 0 && activeMembers.some((m) => m.personalBudget > 0)
          ? activeMembers.reduce((sum, m) => sum + (m.personalBudget || 0), 0)
          : b
          ? Number(b.total_amount)
          : 50000

      // Aggregate category caps across all active members if they defined them
      let aggCaps = b
        ? {
            accommodation: Number(b.accommodation_cap || Math.round(aggregatedGroupBudget * 0.35)),
            food: Number(b.food_cap || Math.round(aggregatedGroupBudget * 0.25)),
            transport: Number(b.transport_cap || Math.round(aggregatedGroupBudget * 0.2)),
            activities: Number(b.activities_cap || Math.round(aggregatedGroupBudget * 0.1)),
            misc: Number(b.misc_cap || Math.round(aggregatedGroupBudget * 0.1)),
          }
        : {
            accommodation: Math.round(aggregatedGroupBudget * 0.35),
            food: Math.round(aggregatedGroupBudget * 0.25),
            transport: Math.round(aggregatedGroupBudget * 0.2),
            activities: Math.round(aggregatedGroupBudget * 0.1),
            misc: Math.round(aggregatedGroupBudget * 0.1),
          }

      return {
        id: t.trip_id,
        name: t.title,
        destination: t.destination_city_id || 'Destination',
        startDate: t.start_date,
        endDate: t.end_date,
        currency: t.home_currency || 'INR',
        budget: aggregatedGroupBudget,
        spent: spentMap.get(t.trip_id) || 0,
        ownerId: t.owner_user_id,
        adults: Number(t.adults || 1),
        children: Number(t.children || 0),
        partySize: Number(t.party_size || 1),
        members: memberMap.get(t.trip_id) || ['usr_you'],
        memberDetails: membersForTrip,
        memberBudgets: memberBudgetsMap.get(t.trip_id) || {},
        isGroupTrip: Boolean(t.is_group_trip),
        categoryCaps: aggCaps,
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

    return rawExpenses.map((e) => ({
      id: e.expense_id,
      tripId: e.trip_id,
      merchant: e.description,
      amount: Number(e.amount),
      currency: e.currency,
      convertedAmount: Number(e.home_amount),
      category: e.category.charAt(0).toUpperCase() + e.category.slice(1),
      date: e.incurred_at
        ? new Date(e.incurred_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : 'Today',
      paidBy:
        e.payer_user_id === 'usr_000000000001' || e.payer_user_id === 'usr_you'
          ? 'You (Aisha)'
          : e.payer_user_id,
      isShared: true,
      splitBetween: ['You (Aisha)', 'Ravi', 'Asha'],
    }))
  } catch (err) {
    console.error('Error fetching expenses from Supabase:', err)
    return initialExpensesFallback
  }
}

// 3. Save New Trip into Supabase (Admin + Members + Budget)
export async function saveTripToSupabase(trip: Trip, ownerUserId: string = 'usr_000000000001'): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    const tripId = trip.id.startsWith('trp_') ? trip.id : `trp_${Date.now()}`
    const now = new Date().toISOString()

    // 1. Insert into trips
    const { error: tripErr } = await supabase.from('trips').insert({
      trip_id: tripId,
      owner_user_id: ownerUserId,
      title: trip.name,
      destination_city_id: 'cty_0b92e2e7', // Canonical City ID
      start_date: trip.startDate || '2026-09-12',
      end_date: trip.endDate || '2026-09-20',
      party_size: trip.partySize || 1,
      adults: trip.adults || 1,
      children: trip.children || 0,
      trip_type: 'friends',
      is_group_trip: Boolean(trip.isGroupTrip),
      status: 'planning',
      home_currency: trip.currency || 'INR',
      created_at: now,
      updated_at: now,
    })

    if (tripErr) console.error('Supabase trip insert error:', tripErr.message)

    // 2. Insert Host as active Owner in trip_members with their personal budget
    const hostBudget = trip.personalBudget || trip.memberBudgets?.[ownerUserId] || trip.budget || 25000
    const { error: hostMemberErr } = await supabase.from('trip_members').upsert({
      member_id: `tmb_${Date.now()}_host`,
      trip_id: tripId,
      user_id: ownerUserId,
      role: 'owner',
      status: 'active',
      personal_budget: hostBudget,
      category_caps: trip.categoryCaps || {},
      created_at: now,
      updated_at: now,
    })

    if (hostMemberErr) console.error('Host trip_member insert error:', hostMemberErr.message)

    // 3. Insert each invited member into trip_members with status: 'pending' and personal_budget: 0
    // (Invited friends will set their own personal budget upon accepting the invite)
    const otherMembers = (trip.members || []).filter((mId) => mId !== ownerUserId)
    for (const mId of otherMembers) {
      const { error: mErr } = await supabase.from('trip_members').upsert({
        member_id: `tmb_${Date.now()}_${mId.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`,
        trip_id: tripId,
        user_id: mId,
        role: 'editor',
        status: 'pending',
        invited_by_user_id: ownerUserId,
        personal_budget: 0,
        category_caps: {},
        created_at: now,
        updated_at: now,
      })
      if (mErr) console.error(`Invited member ${mId} insert error:`, mErr.message)
    }

    // 4. Insert into budgets with initial group fund equal to the Host's personal budget
    const { error: budErr } = await supabase.from('budgets').insert({
      budget_id: `bud_${Date.now()}`,
      trip_id: tripId,
      total_amount: hostBudget,
      currency: trip.currency || 'INR',
      accommodation_cap: trip.categoryCaps?.accommodation || Math.round(hostBudget * 0.35),
      food_cap: trip.categoryCaps?.food || Math.round(hostBudget * 0.25),
      transport_cap: trip.categoryCaps?.transport || Math.round(hostBudget * 0.2),
      activities_cap: trip.categoryCaps?.activities || Math.round(hostBudget * 0.1),
      misc_cap: trip.categoryCaps?.misc || Math.round(hostBudget * 0.1),
      alert_threshold_pct: 80,
      created_at: now,
      updated_at: now,
    })

    if (budErr) console.error('Supabase budget insert error:', budErr.message)
  } catch (err) {
    console.error('Failed to save trip to Supabase:', err)
  }
}

// 4. Accept a Trip Invite & Set Personal Budget (recalculates group budget in DB)
export async function acceptTripInvite(
  tripId: string,
  userId: string,
  personalBudget: number,
  categoryCaps?: any
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true }

  try {
    const now = new Date().toISOString()

    // 1. Update this member's status to 'active' and set their personal budget & category caps
    const { error: updateErr } = await supabase
      .from('trip_members')
      .update({
        status: 'active',
        personal_budget: personalBudget,
        category_caps: categoryCaps || {},
        updated_at: now,
      })
      .eq('trip_id', tripId)
      .eq('user_id', userId)

    if (updateErr) {
      console.error('Failed to accept trip invite:', updateErr.message)
      return { success: false, error: updateErr.message }
    }

    // 2. Query all active members to recompute the new Group Budget total
    const { data: allActiveMembers } = await supabase
      .from('trip_members')
      .select('personal_budget, category_caps')
      .eq('trip_id', tripId)
      .eq('status', 'active')

    const newGroupBudget = (allActiveMembers || []).reduce(
      (sum, m) => sum + Number(m.personal_budget || 0),
      0
    )

    // Aggregate category caps across all active members
    let sumAccom = 0,
      sumFood = 0,
      sumTrans = 0,
      sumAct = 0,
      sumMisc = 0
    ;(allActiveMembers || []).forEach((m) => {
      const caps = m.category_caps || {}
      sumAccom += Number(caps.accommodation || 0)
      sumFood += Number(caps.food || 0)
      sumTrans += Number(caps.transport || 0)
      sumAct += Number(caps.activities || 0)
      sumMisc += Number(caps.misc || 0)
    })

    // If active members did not set category caps individually, apply default ratio
    if (sumAccom + sumFood + sumTrans + sumAct + sumMisc === 0) {
      sumAccom = Math.round(newGroupBudget * 0.35)
      sumFood = Math.round(newGroupBudget * 0.25)
      sumTrans = Math.round(newGroupBudget * 0.2)
      sumAct = Math.round(newGroupBudget * 0.1)
      sumMisc = Math.round(newGroupBudget * 0.1)
    }

    // 3. Update the budgets table with the new group total & category caps
    await supabase
      .from('budgets')
      .update({
        total_amount: newGroupBudget,
        accommodation_cap: sumAccom,
        food_cap: sumFood,
        transport_cap: sumTrans,
        activities_cap: sumAct,
        misc_cap: sumMisc,
        updated_at: now,
      })
      .eq('trip_id', tripId)

    return { success: true }
  } catch (err: any) {
    console.error('acceptTripInvite error:', err)
    return { success: false, error: err.message }
  }
}

// 5. Fetch Pending Invites for a User
export async function fetchPendingTripInvites(userId: string): Promise<any[]> {
  if (!isSupabaseConfigured) return []

  try {
    const { data: pendingMemberships, error } = await supabase
      .from('trip_members')
      .select('*, trips(*)')
      .eq('user_id', userId)
      .eq('status', 'pending')

    if (error || !pendingMemberships || pendingMemberships.length === 0) return []

    // Fetch corresponding group budgets for these pending trips
    const tripIds = pendingMemberships.map((p) => p.trip_id)
    const { data: budgets } = await supabase
      .from('budgets')
      .select('trip_id, total_amount')
      .in('trip_id', tripIds)

    const budgetMap = new Map((budgets || []).map((b) => [b.trip_id, Number(b.total_amount || 0)]))

    pendingMemberships.forEach((p) => {
      if (p.trips) {
        p.trips.budget = budgetMap.get(p.trip_id) || 0
      }
    })

    return pendingMemberships
  } catch (err) {
    console.error('Error fetching pending trip invites:', err)
    return []
  }
}

// 4. Save New Expense into Supabase
export async function saveExpenseToSupabase(expense: Expense, payerUserId: string = 'usr_000000000001'): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    const expId = expense.id.startsWith('exp_') ? expense.id : `exp_${Date.now()}`
    const now = new Date().toISOString()
    const validTripId = expense.tripId === 'europe' ? 'trp_000000000001' : expense.tripId
    const validPayerId =
      payerUserId === 'usr_you' || payerUserId === 'usr_aisha'
        ? 'usr_000000000001'
        : payerUserId
    
    const { error } = await supabase.from('expenses').insert({
      expense_id: expId,
      trip_id: validTripId,
      payer_user_id: validPayerId,
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

// 6. Update Member Personal Budget in Supabase & Recalculate Group Budget
export async function updateMemberPersonalBudgetInSupabase(
  tripId: string,
  userId: string,
  newBudget: number
): Promise<{ success: boolean; newGroupBudget?: number }> {
  if (!isSupabaseConfigured) return { success: true }

  try {
    const now = new Date().toISOString()
    const targetTripId = tripId === 'europe' ? 'trp_000000000001' : tripId

    // 1. Update personal budget in trip_members
    const { error: memberErr } = await supabase
      .from('trip_members')
      .update({
        personal_budget: newBudget,
        updated_at: now,
      })
      .eq('trip_id', targetTripId)
      .eq('user_id', userId)

    if (memberErr) {
      console.warn('Member personal budget update notice:', memberErr.message)
    }

    // 2. Query all active members to recompute the new Group Budget total
    const { data: allActiveMembers } = await supabase
      .from('trip_members')
      .select('personal_budget, category_caps')
      .eq('trip_id', targetTripId)
      .eq('status', 'active')

    const newGroupBudget = (allActiveMembers || []).reduce(
      (sum, m) => sum + Number(m.personal_budget || 0),
      0
    )

    // 3. Update the budgets table with the new group total & category caps
    await supabase
      .from('budgets')
      .update({
        total_amount: newGroupBudget,
        accommodation_cap: Math.round(newGroupBudget * 0.35),
        food_cap: Math.round(newGroupBudget * 0.25),
        transport_cap: Math.round(newGroupBudget * 0.2),
        activities_cap: Math.round(newGroupBudget * 0.1),
        misc_cap: Math.round(newGroupBudget * 0.1),
        updated_at: now,
      })
      .eq('trip_id', targetTripId)

    return { success: true, newGroupBudget }
  } catch (err) {
    console.error('updateMemberPersonalBudgetInSupabase error:', err)
    return { success: false }
  }
}

// 7. Toggle Settlement Status for an Expense in Supabase
export async function toggleSettleExpenseInSupabase(
  expenseId: string,
  isSettled: boolean
): Promise<void> {
  if (!isSupabaseConfigured) return
  try {
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('expenses')
      .update({
        is_settled: isSettled,
        updated_at: now,
      })
      .eq('expense_id', expenseId)

    if (error) {
      console.warn('Supabase toggle settle notice:', error.message)
    }
  } catch (err) {
    console.warn('toggleSettleExpenseInSupabase error:', err)
  }
}
