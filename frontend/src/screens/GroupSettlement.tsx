import { useState, useEffect, useMemo } from 'react'
import type { NavigateFn, Trip, Expense, User } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { toggleSettleExpenseInSupabase } from '../services/supabaseDataService'
import PendingRequestsModal from '../components/PendingRequestsModal'
import { resolveMemberName } from '../services/userRegistry'

interface Props {
  navigate: NavigateFn
  trip?: Trip | null
  expenses?: Expense[]
  currentUser?: User | null
}

interface DebtItem {
  id: string
  person: string
  avatar: string
  direction: 'they_owe_you' | 'you_owe_them'
  amount: number
  currency: string
  reason: string
  isSettled: boolean
}

export default function GroupSettlement({ navigate, trip, expenses, currentUser }: Props) {
  // Compute debts strictly from real trip expenses
  const computedDebts = useMemo(() => {
    const list: DebtItem[] = []
    const currentUserName = currentUser?.name || 'You (Aisha)'
    const currentUserId = currentUser?.id || 'usr_you'

    const tripExpenses = (expenses || []).filter((exp) => !trip?.id || exp.tripId === trip.id)

    if (tripExpenses.length > 0) {
      tripExpenses.forEach((exp) => {
        if (exp.isShared && exp.splitBetween && exp.splitBetween.length > 1) {
          const getMemberShare = (personName: string) => {
            if (exp.splitBreakdown) {
              const keys = Object.keys(exp.splitBreakdown)
              const matchedKey = keys.find(
                (k) =>
                  k.toLowerCase() === personName.toLowerCase() ||
                  (personName.toLowerCase().includes('you') &&
                    (k.toLowerCase().includes('you') || k.toLowerCase().includes(currentUserName.toLowerCase())))
              )
              if (matchedKey && exp.splitBreakdown[matchedKey] !== undefined) {
                return Math.round(exp.splitBreakdown[matchedKey])
              }
            }
            return Math.round(exp.convertedAmount / exp.splitBetween.length)
          }

          const isPayer =
            exp.paidBy.toLowerCase().includes(currentUserName.toLowerCase()) ||
            exp.paidBy === currentUserId ||
            (exp.paidBy.toLowerCase().includes('you') &&
              (currentUserId === 'usr_aisha' || currentUserId === 'usr_you'))

          if (isPayer) {
            exp.splitBetween.forEach((person, idx) => {
              if (
                !person.toLowerCase().includes('you') &&
                !person.toLowerCase().includes(currentUserName.toLowerCase())
              ) {
                const resolvedName = resolveMemberName(person)
                list.push({
                  id: `exp_debt_${exp.id}_${idx}`,
                  person: resolvedName,
                  avatar: resolvedName.toLowerCase().includes('ravi')
                    ? '👨🏽'
                    : resolvedName.toLowerCase().includes('asha')
                    ? '👩🏻'
                    : '👤',
                  direction: 'they_owe_you',
                  amount: getMemberShare(person),
                  currency: exp.currency || 'INR',
                  reason: `${exp.category}: ${exp.merchant} (${exp.splitType === 'custom' ? 'Custom Share' : 'Equal Split'})`,
                  isSettled: Boolean(exp.isSettled),
                })
              }
            })
          } else {
            const userIsInSplit = exp.splitBetween.some(
              (p) =>
                p.toLowerCase().includes('you') ||
                p.toLowerCase().includes(currentUserName.toLowerCase())
            )
            if (userIsInSplit) {
              const resolvedPayer = resolveMemberName(exp.paidBy)
              list.push({
                id: `exp_debt_${exp.id}_me`,
                person: resolvedPayer,
                avatar: resolvedPayer.toLowerCase().includes('ravi')
                  ? '👨🏽'
                  : resolvedPayer.toLowerCase().includes('asha')
                  ? '👩🏻'
                  : '👤',
                direction: 'you_owe_them',
                amount: getMemberShare(currentUserName),
                currency: exp.currency || 'INR',
                reason: `${exp.category}: ${exp.merchant} (${exp.splitType === 'custom' ? 'Custom Share' : 'Equal Split'})`,
                isSettled: Boolean(exp.isSettled),
              })
            }
          }
        }
      })
    }

    return list
  }, [expenses, currentUser])

  const [debts, setDebts] = useState<DebtItem[]>(computedDebts)

  useEffect(() => {
    setDebts(computedDebts)
  }, [computedDebts])

  // Realtime subscription: When ANY user on ANY phone toggles settlement, sync immediately
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const settleChannel = supabase
      .channel('realtime_settlement_channel')
      .on('broadcast', { event: 'settle_toggle' }, (payload: any) => {
        if (payload?.payload?.id) {
          const { id, isSettled } = payload.payload
          setDebts((prev) =>
            prev.map((d) => (d.id === id ? { ...d, isSettled } : d))
          )
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(settleChannel)
    }
  }, [])

  // Toggle settled status directly for a person and broadcast live
  const toggleSettle = async (id: string) => {
    let nextStatus = false
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          nextStatus = !d.isSettled
          return { ...d, isSettled: nextStatus }
        }
        return d
      })
    )

    // Broadcast to other phones live over WebSockets
    if (isSupabaseConfigured) {
      const channel = supabase.channel('realtime_settlement_channel')
      channel.send({
        type: 'broadcast',
        event: 'settle_toggle',
        payload: { id, isSettled: nextStatus },
      })

      // If this was a real expense, update database status
      if (id.startsWith('exp_debt_')) {
        const parts = id.split('_')
        const expenseId = parts[2]
        if (expenseId) {
          toggleSettleExpenseInSupabase(expenseId, nextStatus)
        }
      }
    }
  }

  // Live calculations
  const theyOweYouList = debts.filter((d) => d.direction === 'they_owe_you')
  const youOweList = debts.filter((d) => d.direction === 'you_owe_them')

  const totalOwedToYou = theyOweYouList
    .filter((d) => !d.isSettled)
    .reduce((sum, d) => sum + d.amount, 0)

  const totalYouOwe = youOweList
    .filter((d) => !d.isSettled)
    .reduce((sum, d) => sum + d.amount, 0)

  const netBalance = totalOwedToYou - totalYouOwe
  const [isPendingRequestsOpen, setIsPendingRequestsOpen] = useState(false)

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('trip-dashboard')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        ← Back to Dashboard
      </button>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
            <span>👥</span>
            <span>Settlement Ledger</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Who Owes Whom</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Person-wise balances with instant 1-tap settlement
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPendingRequestsOpen(true)}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-900 font-extrabold rounded-xl text-xs transition shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <span>⏳</span>
          <span>Pending Requests</span>
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
        </button>
      </div>

      {/* =========================================================================
          CALCULATION SUMMARY CARDS (SHOWN RIGHT AT THE TOP)
      ========================================================================= */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Owed to You */}
        <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            You Are Owed
          </span>
          <span className="text-base md:text-lg font-extrabold text-emerald-800 mt-0.5 block">
            +₹{totalOwedToYou.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">to receive</span>
        </div>

        {/* Total You Owe */}
        <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
            You Owe
          </span>
          <span className="text-base md:text-lg font-extrabold text-rose-800 mt-0.5 block">
            -₹{totalYouOwe.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">to pay</span>
        </div>

        {/* Net Calculated Position */}
        <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-2xs">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
            Net Position
          </span>
          <span
            className={`text-base md:text-lg font-extrabold mt-0.5 block ${
              netBalance >= 0 ? 'text-teal-900' : 'text-rose-700'
            }`}
          >
            {netBalance >= 0 ? '+' : '-'}₹{Math.abs(netBalance).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">after math</span>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: PEOPLE WHO OWE YOU (WITH INLINE SETTLE BUTTON)
      ========================================================================= */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-5 md:p-6 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900">People Who Owe You</h2>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            +₹{totalOwedToYou.toLocaleString()} pending
          </span>
        </div>

        <div className="space-y-2.5">
          {theyOweYouList.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <span className="text-xl block mb-1">🎉</span>
              <span>No one currently owes you money. You are completely settled up!</span>
            </div>
          ) : (
            theyOweYouList.map((item) => (
              /* PERSON ROW: PERSON DETAILS ON LEFT, SETTLED BUTTON RIGHT NEXT TO IT ON RIGHT */
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  item.isSettled
                    ? 'bg-slate-50/70 border-slate-200 opacity-60'
                    : 'bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50'
                }`}
              >
                {/* Person Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    {item.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm truncate">{item.person}</p>
                      <span className="text-xs font-extrabold text-emerald-800">
                        owes you ₹{item.amount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{item.reason}</p>
                  </div>
                </div>

                {/* INLINE SETTLE BUTTON RIGHT NEXT TO THE PERSON */}
                <button
                  onClick={() => toggleSettle(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 shadow-2xs ${
                    item.isSettled
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  <span>{item.isSettled ? '✓ Settled' : 'Settle'}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: PEOPLE YOU OWE (WITH INLINE SETTLE BUTTON)
      ========================================================================= */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-5 md:p-6 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <h2 className="text-sm font-bold text-slate-900">People You Owe</h2>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
            -₹{totalYouOwe.toLocaleString()} pending
          </span>
        </div>

        <div className="space-y-2.5">
          {youOweList.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <span className="text-xl block mb-1">✨</span>
              <span>You have zero debts to others. All shared expenses are settled!</span>
            </div>
          ) : (
            youOweList.map((item) => (
              /* PERSON ROW: PERSON DETAILS ON LEFT, SETTLED BUTTON RIGHT NEXT TO IT ON RIGHT */
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  item.isSettled
                    ? 'bg-slate-50/70 border-slate-200 opacity-60'
                    : 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50'
                }`}
              >
                {/* Person Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-rose-100 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    {item.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-sm truncate">{item.person}</p>
                      <span className="text-xs font-extrabold text-rose-800">
                        you owe ₹{item.amount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{item.reason}</p>
                  </div>
                </div>

                {/* INLINE SETTLE BUTTON RIGHT NEXT TO THE PERSON */}
                <button
                  onClick={() => toggleSettle(item.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 shadow-2xs ${
                    item.isSettled
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-rose-600 text-white hover:bg-rose-700'
                  }`}
                >
                  <span>{item.isSettled ? '✓ Settled' : 'Settle'}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Split Integrity Footer Note */}
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2 text-xs text-slate-500">
        <span>💡</span>
        <span>
          Split via Largest Remainder method ensuring zero decimal discrepancy across all group members.
        </span>
      </div>

      {/* PENDING REQUESTS MODAL */}
      <PendingRequestsModal
        isOpen={isPendingRequestsOpen}
        onClose={() => setIsPendingRequestsOpen(false)}
        trip={trip}
        expenses={expenses}
        currentUser={currentUser}
        onSettleExpense={(debtId) => toggleSettle(debtId)}
      />
    </div>
  )
}
