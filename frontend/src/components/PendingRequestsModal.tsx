import { useState } from 'react'
import type { Trip, Expense, User } from '../types'
import { resolveMemberName } from '../services/userRegistry'

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
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set())
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set())

  if (!isOpen) return null

  const currentUserName = currentUser?.name || 'You (Aisha)'
  const currencySymbol = trip?.currency === 'EUR' ? '€' : trip?.currency === 'USD' ? '$' : '₹'

  // 1. Pending Debts / Split Claims (derived strictly from real logged expenses)
  const pendingDebts: PendingDebtItem[] = []

  // Add any dynamic unsettled expenses
  expenses.forEach((exp) => {
    if (exp.isShared && exp.splitBetween && exp.splitBetween.length > 1) {
      const splitAmount = Math.round((exp.convertedAmount || exp.amount) / exp.splitBetween.length)
      const isPayer =
        exp.paidBy.toLowerCase().includes(currentUserName.toLowerCase()) ||
        exp.paidBy.toLowerCase().includes('you')

      if (isPayer) {
        exp.splitBetween.forEach((person, idx) => {
          if (!person.toLowerCase().includes('you') && !person.toLowerCase().includes(currentUserName.toLowerCase())) {
            const resolved = resolveMemberName(person)
            pendingDebts.push({
              id: `req_${exp.id}_${idx}`,
              person: resolved,
              avatar: resolved.toLowerCase().includes('ravi') ? '👨🏽' : resolved.toLowerCase().includes('asha') ? '👩🏻' : '👤',
              direction: 'they_owe_you',
              amount: splitAmount,
              currency: exp.currency || 'INR',
              reason: `${exp.category}: ${exp.merchant}`,
              isSettled: false,
              expenseId: exp.id,
            })
          }
        })
      }
    }
  })

  // Filter out already settled ones in local session
  const activeDebts = pendingDebts.filter((d) => !settledIds.has(d.id))

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
    setSettledIds((prev) => new Set(prev).add(id))
    if (onSettleExpense) onSettleExpense(id)
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
