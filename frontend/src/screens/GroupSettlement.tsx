import { useState, useEffect, useMemo } from 'react'
import type { NavigateFn, Trip, Expense, User } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { toggleSettleExpenseInSupabase } from '../services/supabaseDataService'
import PendingRequestsModal from '../components/PendingRequestsModal'
import { resolveMemberName } from '../services/userRegistry'
import { getCurrencySymbol, isTripMatch } from '../services/currencyService'
import { calculateHareMemberBreakdown, calculateLargestRemainderSplit } from '../features/group-settlement/largestRemainder'
import SettleConfirmationModal, { SettlingTarget } from '../components/SettleConfirmationModal'

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
  expenseIds?: string[]
}

export default function GroupSettlement({ navigate, trip, expenses, currentUser }: Props) {
  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const homeSymbol = getCurrencySymbol(userHomeCurr)

  // Compute user-wise aggregated net bilateral settlement debts
  const computedDebts = useMemo(() => {
    const currentUserName = currentUser?.name || 'You (Aisha)'
    const currentUserId = currentUser?.id || 'usr_you'

    const tripExpenses = (expenses || []).filter((exp) => !trip?.id || isTripMatch(exp.tripId, trip.id))

    // Map of memberName -> { owedToMe: number, iOweThem: number, expenseIds: string[], isAllSettled: boolean }
    const memberMap = new Map<
      string,
      {
        personName: string
        owedToMe: number
        iOweThem: number
        expenseIds: string[]
        isAllSettled: boolean
      }
    >()

    const getMemberShare = (exp: Expense, personName: string) => {
      const expAmount = exp.convertedAmount || exp.amount
      const splitMembers = exp.splitBetween && exp.splitBetween.length > 0 ? exp.splitBetween : (trip?.members || ['usr_you'])

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

      // Hamilton-Hare Largest Remainder Algorithm for zero-drift precision
      const hareMap = calculateHareMemberBreakdown(expAmount, splitMembers)
      const matchedKey = Object.keys(hareMap).find(
        (k) =>
          k.toLowerCase() === personName.toLowerCase() ||
          (personName.toLowerCase().includes('you') &&
            (k.toLowerCase().includes('you') || k.toLowerCase().includes(currentUserName.toLowerCase())))
      )
      if (matchedKey && hareMap[matchedKey] !== undefined) {
        return Math.round(hareMap[matchedKey])
      }

      const count = Math.max(splitMembers.length, 1)
      const shares = calculateLargestRemainderSplit(expAmount, count)
      return Math.round(shares[0] || expAmount / count)
    }

    if (tripExpenses.length > 0) {
      tripExpenses.forEach((exp) => {
        if (exp.isShared && exp.splitBetween && exp.splitBetween.length > 1) {
          const isPayerMe =
            exp.paidBy.toLowerCase().includes(currentUserName.toLowerCase()) ||
            exp.paidBy === currentUserId ||
            exp.paidBy.toLowerCase() === 'you' ||
            exp.paidBy.toLowerCase() === 'usr_you'

          if (isPayerMe) {
            // I paid this expense; each co-member owes me their share
            exp.splitBetween.forEach((person) => {
              if (
                !person.toLowerCase().includes('you') &&
                !person.toLowerCase().includes(currentUserName.toLowerCase())
              ) {
                const resolvedName = resolveMemberName(person)
                const share = getMemberShare(exp, person)

                if (!memberMap.has(resolvedName)) {
                  memberMap.set(resolvedName, {
                    personName: resolvedName,
                    owedToMe: 0,
                    iOweThem: 0,
                    expenseIds: [],
                    isAllSettled: true,
                  })
                }
                const record = memberMap.get(resolvedName)!
                record.expenseIds.push(exp.id)
                if (!exp.isSettled) {
                  record.owedToMe += share
                  record.isAllSettled = false
                }
              }
            })
          } else {
            // Someone else paid this expense; check if I am in the split
            const userIsInSplit = exp.splitBetween.some(
              (p) =>
                p.toLowerCase().includes('you') ||
                p.toLowerCase().includes(currentUserName.toLowerCase())
            )
            if (userIsInSplit) {
              const resolvedPayer = resolveMemberName(exp.paidBy)
              const myShare = getMemberShare(exp, currentUserName)

              if (!memberMap.has(resolvedPayer)) {
                memberMap.set(resolvedPayer, {
                  personName: resolvedPayer,
                  owedToMe: 0,
                  iOweThem: 0,
                  expenseIds: [],
                  isAllSettled: true,
                })
              }
              const record = memberMap.get(resolvedPayer)!
              record.expenseIds.push(exp.id)
              if (!exp.isSettled) {
                record.iOweThem += myShare
                record.isAllSettled = false
              }
            }
          }
        }
      })
    }

    const list: DebtItem[] = []

    memberMap.forEach((rec, personName) => {
      const net = rec.owedToMe - rec.iOweThem
      const avatar = personName.toLowerCase().includes('ravi')
        ? '👨🏽'
        : personName.toLowerCase().includes('asha')
        ? '👩🏻'
        : '👤'

      if (net > 0) {
        // Person owes currentUser net
        list.push({
          id: `debt_net_${personName.replace(/\s+/g, '_')}`,
          person: personName,
          avatar,
          direction: 'they_owe_you',
          amount: Math.round(net),
          currency: userHomeCurr,
          reason: `Net balance across shared trip expenses`,
          isSettled: rec.owedToMe === 0 && rec.isAllSettled,
          expenseIds: rec.expenseIds,
        })
      } else if (net < 0) {
        // currentUser owes Person net
        list.push({
          id: `debt_net_${personName.replace(/\s+/g, '_')}`,
          person: personName,
          avatar,
          direction: 'you_owe_them',
          amount: Math.abs(Math.round(net)),
          currency: userHomeCurr,
          reason: `Net balance across shared trip expenses`,
          isSettled: rec.iOweThem === 0 && rec.isAllSettled,
          expenseIds: rec.expenseIds,
        })
      } else if (rec.isAllSettled && rec.expenseIds.length > 0) {
        list.push({
          id: `debt_net_${personName.replace(/\s+/g, '_')}`,
          person: personName,
          avatar,
          direction: 'they_owe_you',
          amount: 0,
          currency: userHomeCurr,
          reason: `All shared expenses settled`,
          isSettled: true,
          expenseIds: rec.expenseIds,
        })
      }
    })

    return list
  }, [expenses, currentUser, trip])

  // Persistent Set of settled debt IDs to guarantee settled cards vanish immediately and never reappear upon re-render
  const [locallySettledIds, setLocallySettledIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('tripwallet_settled_debt_ids')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // Realtime subscription: Sync live when settlement status changes on any device
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const settleChannel = supabase
      .channel('realtime_settlement_channel')
      .on('broadcast', { event: 'settle_toggle' }, (payload: any) => {
        if (payload?.payload?.id) {
          const { id } = payload.payload
          setLocallySettledIds((prev) => {
            const next = new Set(prev).add(id)
            try {
              localStorage.setItem('tripwallet_settled_debt_ids', JSON.stringify(Array.from(next)))
            } catch {}
            return next
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(settleChannel)
    }
  }, [])

  // Derived debts merging computed debts with local settlement overrides
  const richDebts = useMemo(() => {
    return computedDebts.map((d) => {
      if (locallySettledIds.has(d.id) || (d.expenseIds && d.expenseIds.every((eid) => locallySettledIds.has(eid)))) {
        return { ...d, isSettled: true }
      }
      return d
    })
  }, [computedDebts, locallySettledIds])

  // Toggle settled status for an aggregated person debt item
  const toggleSettle = async (id: string) => {
    const targetItem = richDebts.find((d) => d.id === id)

    setLocallySettledIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      if (targetItem?.expenseIds) {
        targetItem.expenseIds.forEach((eid) => next.add(eid))
      }
      try {
        localStorage.setItem('tripwallet_settled_debt_ids', JSON.stringify(Array.from(next)))
      } catch (e) {
        console.warn('Failed to store settled debt IDs in localStorage:', e)
      }
      return next
    })

    if (isSupabaseConfigured) {
      const channel = supabase.channel('realtime_settlement_channel')
      channel.send({
        type: 'broadcast',
        event: 'settle_toggle',
        payload: { id, isSettled: true },
      })

      // Toggle all underlying expense IDs in Supabase database
      if (targetItem && targetItem.expenseIds && targetItem.expenseIds.length > 0) {
        targetItem.expenseIds.forEach((expId) => {
          toggleSettleExpenseInSupabase(expId, true)
        })
      }
    }
  }

  // Live calculations: separate active pending debts from settled completed transactions
  const activeTheyOweYouList = richDebts.filter((d) => d.direction === 'they_owe_you' && !d.isSettled)
  const activeYouOweList = richDebts.filter((d) => d.direction === 'you_owe_them' && !d.isSettled)
  const completedSettlementsList = richDebts.filter((d) => d.isSettled)

  const totalOwedToYou = activeTheyOweYouList.reduce((sum, d) => sum + d.amount, 0)
  const totalYouOwe = activeYouOweList.reduce((sum, d) => sum + d.amount, 0)
  const netBalance = totalOwedToYou - totalYouOwe

  const [isPendingRequestsOpen, setIsPendingRequestsOpen] = useState(false)
  const [confirmModalTarget, setConfirmModalTarget] = useState<SettlingTarget | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [showCompletedHistory, setShowCompletedHistory] = useState(false)

  const promptSettleConfirm = (item: DebtItem) => {
    if (item.isSettled) return
    setConfirmModalTarget({
      id: item.id,
      person: item.person,
      avatar: item.avatar,
      amount: item.amount,
      currency: item.currency,
      direction: item.direction,
      reason: item.reason,
    })
  }

  const handleExecuteConfirmedSettle = () => {
    if (!confirmModalTarget) return
    const target = confirmModalTarget
    setConfirmModalTarget(null)
    toggleSettle(target.id)
    setToastMsg(
      `✓ Successfully settled ${homeSymbol}${target.amount.toLocaleString()} with ${target.person}!`
    )
    setTimeout(() => setToastMsg(null), 4000)
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Toast Confirmation Notification */}
      {toastMsg && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg font-extrabold text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2">
            <span>🎉</span>
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-white/80 hover:text-white font-bold text-sm ml-2"
          >
            ✕
          </button>
        </div>
      )}

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
            Person-wise balances with one-time confirmed settlement transfer
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
            +{homeSymbol}{totalOwedToYou.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">to receive</span>
        </div>

        {/* Total You Owe */}
        <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
            You Owe
          </span>
          <span className="text-base md:text-lg font-extrabold text-rose-800 mt-0.5 block">
            -{homeSymbol}{totalYouOwe.toLocaleString()}
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
            {netBalance >= 0 ? '+' : '-'}{homeSymbol}{Math.abs(netBalance).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">after math</span>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: PEOPLE WHO OWE YOU (ACTIVE UNSETTLED DEBTS ONLY)
      ========================================================================= */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-5 md:p-6 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900">People Who Owe You</h2>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            +{homeSymbol}{totalOwedToYou.toLocaleString()} pending
          </span>
        </div>

        <div className="space-y-2.5">
          {activeTheyOweYouList.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <span className="text-xl block mb-1">🎉</span>
              <span>No one currently owes you money. You are completely settled up!</span>
            </div>
          ) : (
            activeTheyOweYouList.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 bg-emerald-50/40 border-emerald-200/80 hover:bg-emerald-50"
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
                        owes you {homeSymbol}{item.amount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{item.reason}</p>
                  </div>
                </div>

                {/* INLINE SETTLE BUTTON */}
                <button
                  type="button"
                  onClick={() => promptSettleConfirm(item)}
                  className="px-3.5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <span>Acknowledge Settle</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: PEOPLE YOU OWE (ACTIVE UNSETTLED DEBTS ONLY)
      ========================================================================= */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-5 md:p-6 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <h2 className="text-sm font-bold text-slate-900">People You Owe</h2>
          </div>
          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
            -{homeSymbol}{totalYouOwe.toLocaleString()} pending
          </span>
        </div>

        <div className="space-y-2.5">
          {activeYouOweList.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <span className="text-xl block mb-1">✨</span>
              <span>You have zero debts to others. All shared expenses are settled!</span>
            </div>
          ) : (
            activeYouOweList.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 bg-rose-50/40 border-rose-200/80 hover:bg-rose-50"
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
                        You owe {homeSymbol}{item.amount.toLocaleString()} to {item.person}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{item.reason}</p>
                  </div>
                </div>

                {/* INLINE SETTLE BUTTON */}
                <button
                  type="button"
                  onClick={() => promptSettleConfirm(item)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white active:scale-95 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <span>Pay & Settle {homeSymbol}{item.amount.toLocaleString()}</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: COMPLETED / SETTLED TRANSACTIONS HISTORY (COLLAPSIBLE)
      ========================================================================= */}
      {completedSettlementsList.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 md:p-5 space-y-3">
          <button
            type="button"
            onClick={() => setShowCompletedHistory((prev) => !prev)}
            className="w-full flex items-center justify-between text-left text-xs font-extrabold text-slate-700 hover:text-slate-900"
          >
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>Completed Settlements ({completedSettlementsList.length})</span>
            </div>
            <span>{showCompletedHistory ? '▲ Hide' : '▼ View History'}</span>
          </button>

          {showCompletedHistory && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {completedSettlementsList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs opacity-75"
                >
                  <div className="flex items-center gap-2.5">
                    <span>{item.avatar}</span>
                    <div>
                      <p className="font-bold text-slate-800">{item.person}</p>
                      <p className="text-[10px] text-slate-400">{item.reason}</p>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-emerald-200">
                    ✓ Settled ({homeSymbol}{item.amount.toLocaleString()})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Split Integrity Footer Note */}
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2 text-xs text-slate-500">
        <span>💡</span>
        <span>
          Split via Largest Remainder method ensuring zero decimal discrepancy across all group members. Settlement transfer is recorded as a one-time final transaction.
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

      {/* ONE-TIME SETTLEMENT CONFIRMATION MODAL */}
      <SettleConfirmationModal
        isOpen={Boolean(confirmModalTarget)}
        onClose={() => setSettleConfirmTarget(null)}
        onConfirm={handleExecuteConfirmedSettle}
        item={confirmModalTarget}
        homeSymbol={homeSymbol}
      />
    </div>
  )
}
