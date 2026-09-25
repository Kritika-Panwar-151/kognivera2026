import { useState, useEffect } from 'react'
import type { Trip, Expense, User } from '../types'
import { resolveMemberName, isUserMatch } from '../services/userRegistry'
import { getCurrencySymbol, isTripMatch } from '../services/currencyService'
import { calculateHareMemberBreakdown } from '../features/group-settlement/largestRemainder'

export interface PendingDebtItem {
  id: string
  person: string
  avatar: string
  direction: 'they_owe_you' | 'you_owe_them'
  amount: number
  currency: string
  reason: string
  isSettled: boolean
  expenseId?: string
  splits?: { merchant: string; amount: number; category: string; date: string; direction: 'they_owe_you' | 'you_owe_them' }[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  trip?: Trip | null
  expenses?: Expense[]
  currentUser?: User | null
  onSettleExpense?: (debtId: string) => void
}

export default function PendingRequestsModal({
  isOpen,
  onClose,
  trip,
  expenses = [],
  currentUser,
  onSettleExpense,
}: Props) {
  const [activeTab, setActiveTab] = useState<'debts' | 'invites'>('debts')
  const [settledIds, setSettledIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('tripwallet_settled_debt_ids')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const syncSettled = () => {
      try {
        const saved = localStorage.getItem('tripwallet_settled_debt_ids')
        if (saved) setSettledIds(new Set(JSON.parse(saved)))
      } catch {}
    }
    window.addEventListener('tripwallet_settlement_updated', syncSettled)
    window.addEventListener('storage', syncSettled)
    return () => {
      window.removeEventListener('tripwallet_settlement_updated', syncSettled)
      window.removeEventListener('storage', syncSettled)
    }
  }, [])

  if (!isOpen) return null

  const currentUserName = currentUser?.name || 'You (Aisha)'
  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const currencySymbol = getCurrencySymbol(userHomeCurr)

  const tripExpenses = (expenses || []).filter((exp) => !trip?.id || isTripMatch(exp.tripId, trip.id))

  // 1. Pending Debts / Split Claims (user-wise aggregated net debts derived strictly from real logged expenses)
  const memberMap = new Map<
    string,
    {
      personName: string
      owedToMe: number
      iOweThem: number
      expenseIds: string[]
      splits: { merchant: string; amount: number; category: string; date: string; direction: 'they_owe_you' | 'you_owe_them' }[]
    }
  >()

  const getMemberShare = (exp: Expense, personName: string) => {
    const expAmount = exp.convertedAmount || exp.amount
    const splitMembers =
      exp.splitBetween && exp.splitBetween.length > 0
        ? exp.splitBetween
        : exp.splitBreakdown
        ? Object.keys(exp.splitBreakdown)
        : trip?.members || ['usr_you']

    if (exp.splitBreakdown) {
      const keys = Object.keys(exp.splitBreakdown)
      const matchedKey = keys.find(
        (k) =>
          isUserMatch(k, { id: personName, name: personName }) ||
          k.toLowerCase() === personName.toLowerCase() ||
          resolveMemberName(k).toLowerCase() === resolveMemberName(personName).toLowerCase()
      )
      if (matchedKey && exp.splitBreakdown[matchedKey] !== undefined) {
        return Math.round(exp.splitBreakdown[matchedKey])
      }
    }

    const hareMap = calculateHareMemberBreakdown(expAmount, splitMembers)
    const matchedKey = Object.keys(hareMap).find(
      (k) =>
        isUserMatch(k, { id: personName, name: personName }) ||
        k.toLowerCase() === personName.toLowerCase() ||
        resolveMemberName(k).toLowerCase() === resolveMemberName(personName).toLowerCase()
    )
    if (matchedKey && hareMap[matchedKey] !== undefined) {
      return Math.round(hareMap[matchedKey])
    }

    const count = Math.max(splitMembers.length, 1)
    return Math.round(expAmount / count)
  }

  tripExpenses.forEach((exp) => {
    const splitMembers =
      exp.splitBetween && exp.splitBetween.length > 0
        ? exp.splitBetween
        : exp.splitBreakdown
        ? Object.keys(exp.splitBreakdown)
        : []

    const isSharedExp =
      exp.isShared ||
      splitMembers.length > 1 ||
      (exp.splitBreakdown && Object.keys(exp.splitBreakdown).length > 1)

    if (isSharedExp && splitMembers.length > 1 && !exp.isSettled) {
      const isPayer = isUserMatch(exp.paidBy, currentUser)

      if (isPayer) {
        splitMembers.forEach((person) => {
          if (!isUserMatch(person, currentUser)) {
            const resolved = resolveMemberName(person)
            const share = getMemberShare(exp, person)
            if (!memberMap.has(resolved)) {
              memberMap.set(resolved, { personName: resolved, owedToMe: 0, iOweThem: 0, expenseIds: [], splits: [] })
            }
            const rec = memberMap.get(resolved)!
            rec.owedToMe += share
            rec.expenseIds.push(exp.id)
            if (share > 0) {
              rec.splits.push({
                merchant: exp.merchant || 'Shared Expense',
                amount: share,
                category: exp.category || 'Other',
                date: exp.date || '',
                direction: 'they_owe_you',
              })
            }
          }
        })
      } else {
        const userIsInSplit = splitMembers.some((p) => isUserMatch(p, currentUser))
        if (userIsInSplit) {
          const resolvedPayer = resolveMemberName(exp.paidBy)
          const myShare = getMemberShare(exp, currentUserName)
          if (!memberMap.has(resolvedPayer)) {
            memberMap.set(resolvedPayer, { personName: resolvedPayer, owedToMe: 0, iOweThem: 0, expenseIds: [], splits: [] })
          }
          const rec = memberMap.get(resolvedPayer)!
          rec.iOweThem += myShare
          rec.expenseIds.push(exp.id)
          if (myShare > 0) {
            rec.splits.push({
              merchant: exp.merchant || 'Shared Expense',
              amount: myShare,
              category: exp.category || 'Other',
              date: exp.date || '',
              direction: 'you_owe_them',
            })
          }
        }
      }
    }
  })

  const pendingDebts: PendingDebtItem[] = []
  memberMap.forEach((rec, personName) => {
    const net = rec.owedToMe - rec.iOweThem
    const avatar = personName.toLowerCase().includes('ravi') ? '👨🏽' : personName.toLowerCase().includes('asha') ? '👩🏻' : '👤'
    if (net > 0) {
      pendingDebts.push({
        id: `req_net_${personName.replace(/\s+/g, '_')}`,
        person: personName,
        avatar,
        direction: 'they_owe_you',
        amount: Math.round(net),
        currency: userHomeCurr,
        reason: `Net balance across ${rec.splits.filter((s) => s.direction === 'they_owe_you').length} split expense(s)`,
        isSettled: false,
        expenseId: rec.expenseIds[0],
        splits: rec.splits.filter((s) => s.direction === 'they_owe_you'),
      })
    } else if (net < 0) {
      pendingDebts.push({
        id: `req_net_${personName.replace(/\s+/g, '_')}`,
        person: personName,
        avatar,
        direction: 'you_owe_them',
        amount: Math.abs(Math.round(net)),
        currency: userHomeCurr,
        reason: `Net balance across ${rec.splits.filter((s) => s.direction === 'you_owe_them').length} split expense(s)`,
        isSettled: false,
        expenseId: rec.expenseIds[0],
        splits: rec.splits.filter((s) => s.direction === 'you_owe_them'),
      })
    }
  })

  // Filter out already settled ones in local session
  const activeDebts = pendingDebts.filter((d) => {
    const rec = memberMap.get(d.person)
    if (rec && rec.expenseIds.length > 0 && rec.expenseIds.every((eid) => settledIds.has(eid))) {
      return false
    }
    return !settledIds.has(d.id)
  })

  const totalOwedToYou = activeDebts
    .filter((d) => d.direction === 'they_owe_you')
    .reduce((s, d) => s + d.amount, 0)

  const totalYouOwe = activeDebts
    .filter((d) => d.direction === 'you_owe_them')
    .reduce((s, d) => s + d.amount, 0)

  // 2. Pending Trip Invites (derived strictly from real trip member details with pending status)
  const isHost = !trip?.ownerId || trip.ownerId === currentUser?.id || currentUser?.id === 'usr_you'
  const pendingInvites = isHost
    ? (trip?.memberDetails || [])
        .filter((d) => d.status === 'pending')
        .map((d) => {
          const resolvedName = resolveMemberName(d.userId)
          return {
            id: d.userId,
            name: resolvedName,
            email: d.email || `${d.userId}@example.invalid`,
            avatar: resolvedName.toLowerCase().includes('asha') ? '👩🏻' : resolvedName.toLowerCase().includes('ravi') ? '👨🏽' : '👤',
            role: 'Member',
            date: 'Invite Sent',
          }
        })
    : []

  const handleSettle = (id: string) => {
    const targetItem = activeDebts.find((d) => d.id === id)
    setSettledIds((prev) => {
      const next = new Set(prev).add(id)
      if (targetItem) {
        const rec = memberMap.get(targetItem.person)
        if (rec?.expenseIds) {
          rec.expenseIds.forEach((eid) => next.add(eid))
        }
      }
      try {
        localStorage.setItem('tripwallet_settled_debt_ids', JSON.stringify(Array.from(next)))
        window.dispatchEvent(new CustomEvent('tripwallet_settlement_updated', { detail: { id } }))
      } catch {}
      return next
    })
    onSettleExpense?.(id)
  }

  const handleRemind = (debt: PendingDebtItem) => {
    setRemindedIds((prev) => new Set(prev).add(debt.id))
    const msg = `Hey ${debt.person}! Friendly reminder from TripWallet: your pending split share of ₹${debt.amount.toLocaleString()} for "${debt.reason}" is ready for settlement.`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handlePayUpi = (debt: PendingDebtItem) => {
    const upiUrl = `upi://pay?pa=tripwallet.companion@axisbank&pn=${encodeURIComponent(debt.person)}&am=${debt.amount}&cu=INR&tn=${encodeURIComponent('TripWallet: ' + debt.reason)}`
    window.location.href = upiUrl
    handleSettle(debt.id)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-teal-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-teal-50/50 to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl shadow-xs">
              ⏳
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-slate-900">Pending Requests Center</h2>
              <p className="text-xs text-slate-500">Unsettled group debts, split claims & pending invites</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher & Summary Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('debts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'debts' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>💸 Pending Debts</span>
              <span className="bg-teal-100 text-teal-900 px-1.5 py-0.2 rounded-full text-[10px]">
                {activeDebts.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'invites' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>✉️ Pending Invites</span>
              <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px]">
                {pendingInvites.length}
              </span>
            </button>
          </div>

          {activeTab === 'debts' && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-700 font-bold">
                To Receive: +{currencySymbol}{totalOwedToYou.toLocaleString()}
              </span>
              <span className="text-rose-600 font-bold">
                You Owe: -{currencySymbol}{totalYouOwe.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'debts' ? (
            activeDebts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <span className="text-4xl">🎉</span>
                <p className="font-bold text-slate-700">All Settled Up!</p>
                <p className="text-xs">There are no outstanding debts or split claims right now.</p>
              </div>
            ) : (
              activeDebts.map((debt) => (
                <div
                  key={debt.id}
                  className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-teal-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{debt.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">{debt.person}</span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            debt.direction === 'they_owe_you'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {debt.direction === 'they_owe_you' ? 'Owes You' : 'You Owe'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{debt.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span
                      className={`text-sm font-black ${
                        debt.direction === 'they_owe_you' ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {debt.direction === 'they_owe_you' ? '+' : '-'}
                      {currencySymbol}{debt.amount.toLocaleString()}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {debt.direction === 'they_owe_you' ? (
                        <button
                          type="button"
                          onClick={() => handleRemind(debt)}
                          disabled={remindedIds.has(debt.id)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                            remindedIds.has(debt.id)
                              ? 'bg-slate-100 text-slate-400'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                          title="Remind person via WhatsApp"
                        >
                          {remindedIds.has(debt.id) ? '✓ Reminded' : '💬 WhatsApp Remind'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePayUpi(debt)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-2xs"
                          title="Pay via UPI Deep Link (GPay / PhonePe / Paytm)"
                        >
                          ⚡ Pay via UPI
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSettle(debt.id)}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg transition shadow-2xs"
                      >
                        ✓ Settle
                      </button>
                    </div>
                  </div>

                  {/* INDIVIDUAL SPLIT BREAKDOWN */}
                  {debt.splits && debt.splits.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {debt.splits.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-slate-700"
                        >
                          <span className="font-semibold truncate">
                            {s.merchant} <span className="text-slate-400 font-normal">({s.category})</span>
                          </span>
                          <span
                            className={`font-extrabold shrink-0 ${
                              s.direction === 'they_owe_you' ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {s.direction === 'they_owe_you' ? '+' : '-'}
                            {currencySymbol}{s.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{inv.avatar}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{inv.name}</span>
                      <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        ⏳ Pending Join
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{inv.email} · {inv.date}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => alert(`Resent invitation email to ${inv.email}`)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
                  >
                    Resend
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Automated settlement via UPI / IBAN supported.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
