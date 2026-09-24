import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Trip, Expense, User } from '../types'

// Clean production fallbacks: zero synthetic data for fresh users
export const initialTripsFallback: Trip[] = []
export const initialExpensesFallback: Expense[] = []

// 1. Fetch Trips from Supabase
export async function fetchTripsFromSupabase(): Promise<Trip[]> {
  if (!isSupabaseConfigured) return []

  try {
    const { data: rawTrips, error: tripsErr } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })

    if (tripsErr || !rawTrips || rawTrips.length === 0) {
      return []
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
      const activeMembers = membersForTrip.filter((m) => m.status === 'active' || !m.status)
      const activeMembersSum = activeMembers.reduce((sum, m) => sum + (m.personalBudget || 0), 0)
      const dbBudgetTotal = b ? Number(b.total_amount || 0) : 0
      const tripRawBudget = Number(t.budget || 0)

      // Master Group budget is the maximum of explicit group budget, database total, and active members sum
      const aggregatedGroupBudget = Math.max(
        dbBudgetTotal,
        activeMembersSum,
        tripRawBudget,
        dbBudgetTotal === 0 && activeMembersSum === 0 && tripRawBudget === 0 ? 50000 : 0
      )

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
      return []
    }

    return rawExpenses.map((e) => {
      const payerId = e.payer_user_id || 'usr_aisha'
      const rawSplit = Array.isArray(e.split_between) && e.split_between.length > 0
        ? e.split_between
        : [payerId]
      
      const isShared = e.is_shared !== undefined && e.is_shared !== null
        ? Boolean(e.is_shared) && rawSplit.length > 1
        : rawSplit.length > 1

      const splitBetween = isShared ? rawSplit : [payerId]

      return {
        id: e.expense_id,
        tripId: e.trip_id,
        merchant: e.description || 'Expense',
        amount: Number(e.amount || 0),
        currency: e.currency || 'INR',
        convertedAmount: Number(e.home_amount || e.amount || 0),
        category: e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1) : 'Other',
        date: e.incurred_at
          ? new Date(e.incurred_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          : 'Today',
        paidBy: payerId,
        isShared,
        splitBetween,
      }
    })
  } catch (err) {
    console.error('Error fetching expenses from Supabase:', err)
    return []
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
      destination_city_id: trip.destination || 'Destination',
      start_date: trip.startDate || new Date().toLocaleDateString('sv-SE'),
      end_date: trip.endDate || new Date(Date.now() + 7 * 86400000).toLocaleDateString('sv-SE'),
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

    // 4. Insert into budgets with initial group fund equal to the full trip group budget
    const tripTotalGroupBudget = Number(trip.budget || 0) > 0 ? Number(trip.budget) : hostBudget
    const { error: budErr } = await supabase.from('budgets').insert({
      budget_id: `bud_${Date.now()}`,
      trip_id: tripId,
      total_amount: tripTotalGroupBudget,
      currency: trip.currency || 'INR',
      accommodation_cap: trip.categoryCaps?.accommodation || Math.round(tripTotalGroupBudget * 0.35),
      food_cap: trip.categoryCaps?.food || Math.round(tripTotalGroupBudget * 0.25),
      transport_cap: trip.categoryCaps?.transport || Math.round(tripTotalGroupBudget * 0.2),
      activities_cap: trip.categoryCaps?.activities || Math.round(tripTotalGroupBudget * 0.1),
      misc_cap: trip.categoryCaps?.misc || Math.round(tripTotalGroupBudget * 0.1),
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

    const { data: existingBud } = await supabase
      .from('budgets')
      .select('total_amount')
      .eq('trip_id', tripId)
      .single()

    const activeMembersSum = (allActiveMembers || []).reduce(
      (sum, m) => sum + Number(m.personal_budget || 0),
      0
    )
    const existingTotal = Number(existingBud?.total_amount || 0)
    const newGroupBudget = Math.max(existingTotal, activeMembersSum)

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
export async function saveExpenseToSupabase(expense: Expense, payerUserId: string = 'usr_aisha'): Promise<void> {
  if (!isSupabaseConfigured) return

  try {
    const expId = expense.id.startsWith('exp_') ? expense.id : `exp_${Date.now()}`
    const now = new Date().toISOString()
    const validTripId = expense.tripId === 'europe' ? 'trp_000000000001' : expense.tripId
    const validPayerId = expense.paidBy || payerUserId || 'usr_aisha'
    
    const isSharedVal = Boolean(expense.isShared && expense.splitBetween && expense.splitBetween.length > 1)
    const splitBetweenArr = isSharedVal ? (expense.splitBetween || [validPayerId]) : [validPayerId]

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
      split_between: splitBetweenArr,
      status: 'active',
      created_at: now,
      updated_at: now,
    })

    if (error) console.error('Supabase expense insert error:', error.message)
  } catch (err) {
    console.error('Failed to save expense to Supabase:', err)
  }
}

// 5. Delete Expense from Supabase
export async function deleteExpenseFromSupabase(expenseId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true

  try {
    const { error } = await supabase.from('expenses').delete().eq('expense_id', expenseId)
    if (error) {
      console.error('Supabase expense delete error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to delete expense from Supabase:', err)
    return false
  }
}

// 6. Update Existing Expense in Supabase
export async function updateExpenseInSupabase(
  expenseId: string,
  updates: Partial<Expense>
): Promise<boolean> {
  if (!isSupabaseConfigured) return true

  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.merchant !== undefined) payload.description = updates.merchant
    if (updates.amount !== undefined) payload.amount = updates.amount
    if (updates.currency !== undefined) payload.currency = updates.currency
    if (updates.convertedAmount !== undefined) payload.home_amount = updates.convertedAmount
    if (updates.category !== undefined) payload.category = updates.category.toLowerCase()
    if (updates.date !== undefined) payload.incurred_at = updates.date
    if (updates.splitBetween !== undefined) payload.split_between = updates.splitBetween

    const { error } = await supabase.from('expenses').update(payload).eq('expense_id', expenseId)
    if (error) {
      console.error('Supabase expense update error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to update expense in Supabase:', err)
    return false
  }
}

// 7. Update Master Trip Details in Supabase (Dates, Budget, Destination, Name)
export async function updateTripDetailsInSupabase(
  tripId: string,
  updates: {
    name?: string
    budget?: number
    destination?: string
    startDate?: string
    endDate?: string
  }
): Promise<boolean> {
  if (!isSupabaseConfigured) return true

  try {
    const targetTripId = tripId === 'europe' ? 'trp_000000000001' : tripId
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.name !== undefined) payload.title = updates.name
    if (updates.budget !== undefined) payload.budget = updates.budget
    if (updates.destination !== undefined) payload.destination_city_id = updates.destination
    if (updates.startDate !== undefined) payload.start_date = updates.startDate
    if (updates.endDate !== undefined) payload.end_date = updates.endDate

    const { error } = await supabase.from('trips').update(payload).eq('trip_id', targetTripId)
    if (error) {
      console.error('Supabase trip update error:', error.message)
      return false
    }

    if (updates.budget !== undefined && updates.budget > 0) {
      const b = updates.budget
      await supabase
        .from('budgets')
        .update({
          total_amount: b,
          accommodation_cap: Math.round(b * 0.35),
          food_cap: Math.round(b * 0.25),
          transport_cap: Math.round(b * 0.20),
          activities_cap: Math.round(b * 0.10),
          misc_cap: Math.round(b * 0.10),
          updated_at: new Date().toISOString(),
        })
        .eq('trip_id', targetTripId)
    }

    return true
  } catch (err) {
    console.error('Failed to update trip details in Supabase:', err)
    return false
  }
}

// 8. Update Member Personal Budget in Supabase & Recalculate Group Budget
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

    const { data: existingBud } = await supabase
      .from('budgets')
      .select('total_amount')
      .eq('trip_id', targetTripId)
      .single()

    const activeMembersSum = (allActiveMembers || []).reduce(
      (sum, m) => sum + Number(m.personal_budget || 0),
      0
    )
    const existingTotal = Number(existingBud?.total_amount || 0)
    const newGroupBudget = Math.max(existingTotal, activeMembersSum)

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

// 8. Invite / Add a member to a trip in Supabase
export async function inviteMemberToTripInSupabase(
  tripId: string,
  invitedUserId: string,
  hostUserId: string,
  status: 'pending' | 'active' = 'pending',
  personalBudget: number = 0
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true }
  try {
    const targetTripId = tripId === 'europe' ? 'trp_000000000001' : tripId
    const now = new Date().toISOString()
    const memberId = `tmb_${Date.now()}_${invitedUserId.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`

    const { error } = await supabase.from('trip_members').upsert(
      {
        member_id: memberId,
        trip_id: targetTripId,
        user_id: invitedUserId,
        role: 'editor',
        status: status,
        invited_by_user_id: hostUserId,
        personal_budget: personalBudget,
        category_caps: {},
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'trip_id,user_id' }
    )

    if (error) {
      console.error('Failed to insert trip_member in Supabase:', error.message)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    console.error('inviteMemberToTripInSupabase error:', err)
    return { success: false, error: err.message }
  }
}

// 9. Remove a member from a trip in Supabase
export async function removeMemberFromTripInSupabase(
  tripId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true }
  try {
    const targetTripId = tripId === 'europe' ? 'trp_000000000001' : tripId
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', targetTripId)
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to remove member from trip_members in Supabase:', error.message)
      return { success: false, error: error.message }
    }

    // Recalculate group budget from remaining active members
    const { data: allActiveMembers } = await supabase
      .from('trip_members')
      .select('personal_budget')
      .eq('trip_id', targetTripId)
      .eq('status', 'active')

    const newGroupBudget = (allActiveMembers || []).reduce(
      (sum, m) => sum + Number(m.personal_budget || 0),
      0
    )

    if (newGroupBudget > 0) {
      await supabase
        .from('budgets')
        .update({
          total_amount: newGroupBudget,
          updated_at: new Date().toISOString(),
        })
        .eq('trip_id', targetTripId)
    }

    return { success: true }
  } catch (err: any) {
    console.error('removeMemberFromTripInSupabase error:', err)
    return { success: false, error: err.message }
  }
}

// 10. Broadcast general trip changes live over global WebSockets
export function broadcastTripChange(payload: Record<string, any>): void {
  if (!isSupabaseConfigured) return
  try {
    const channel = supabase.channel('global_trip_sync')
    channel.send({
      type: 'broadcast',
      event: payload.action || 'trip_updated',
      payload,
    })
  } catch (err) {
    console.warn('broadcastTripChange error:', err)
  }
}
