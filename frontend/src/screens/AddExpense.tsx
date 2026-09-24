import { useState } from 'react'
import type { NavigateFn, Expense } from '../types'

interface Props {
  navigate: NavigateFn
  onAddExpense?: (expense: Expense) => void
}

const categories = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other']
const currencies = ['INR (₹)', 'EUR (€)', 'USD ($)', 'GBP (£)', 'JPY (¥)', 'SGD (S$)']
const availableMembers = ['You (Aisha)', 'Ravi', 'Asha', 'David']

const catIcons: Record<string, string> = {
  Food: '🍽️',
  Transport: '🚗',
  Accommodation: '🏨',
  Activities: '⭐',
  Shopping: '🛍️',
  Other: '📦',
}

const FX_RATES: Record<string, number> = {
  EUR: 94.0,
  USD: 86.5,
  GBP: 112.4,
  SGD: 65.2,
  JPY: 0.58,
  INR: 1.0,
}

export default function AddExpense({ navigate, onAddExpense }: Props) {
  // Classification: 'shared' (trip dashboard expense, split across all trip members) vs 'personal' (flexible personal, select specific people to split with)
  const [expenseType, setExpenseType] = useState<'personal' | 'shared'>('personal')
  const [amount, setAmount] = useState('1200')
  const [currency, setCurrency] = useState('INR (₹)')
  const [category, setCategory] = useState('Food')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState('2026-09-16')
  const [paidBy, setPaidBy] = useState('You (Aisha)')
  const [personalSplitMembers, setPersonalSplitMembers] = useState<string[]>(['You (Aisha)'])
  const [notes, setNotes] = useState('')

  const currCode = currency.split(' ')[0]
  const numAmount = parseFloat(amount) || 0
  const rate = FX_RATES[currCode] || 1.0
  const convertedAmount = Math.round(numAmount * rate)

  // Trip members for shared trip budget expenses
  const allTripMembers = ['You (Aisha)', 'Ravi', 'Asha']
  const tripPerPerson = (convertedAmount / allTripMembers.length).toFixed(2)

  // Personal split calculation
  const personalCount = Math.max(personalSplitMembers.length, 1)
  const personalPerPerson = (convertedAmount / personalCount).toFixed(2)

  const togglePersonalMember = (m: string) => {
    setPersonalSplitMembers((prev) => {
      if (prev.includes(m)) {
        // don't allow empty, default to at least one
        return prev.length > 1 ? prev.filter((x) => x !== m) : prev
      } else {
        return [...prev, m]
      }
    })
  }

  const handleSave = () => {
    const isShared = expenseType === 'shared'
    const newExp: Expense = {
      id: `exp_${Date.now().toString(36)}`,
      tripId: isShared ? 'europe' : 'personal',
      merchant: merchant.trim() || `${category} Spend`,
      amount: numAmount,
      currency: currCode,
      convertedAmount,
      category,
      date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      paidBy,
      isShared,
      splitBetween: isShared ? allTripMembers : personalSplitMembers,
      notes,
    }

    if (onAddExpense) {
      onAddExpense(newExp)
    }
    navigate('expense-history')
  }

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      <button
        onClick={() => navigate('expense-history')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition"
      >
        ← Back to Expenses
      </button>

      {/* Header with Quick Scan Button */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Add an Expense</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Log personal flexible expenses or group trip budget items
          </p>
        </div>

        <button
          onClick={() => navigate('receipt-scanner')}
          className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0"
        >
          <span>📸 Scan Receipt</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-5 md:p-6 space-y-5">
        {/* EXPENSE CLASSIFICATION: PERSONAL (CHOOSE PEOPLE) VS SHARED TRIP (ALL TRIP MEMBERS) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Expense Type
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setExpenseType('personal')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                expenseType === 'personal'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👤 Personal (Flexible Split)</span>
            </button>
            <button
              type="button"
              onClick={() => setExpenseType('shared')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                expenseType === 'shared'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🧳 Trip Expense (Split All)</span>
            </button>
          </div>

          {/* Context Banner */}
          {expenseType === 'personal' ? (
            <div className="mt-2.5 p-3 bg-indigo-50/80 border border-indigo-200/60 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
              <strong>Personal & Flexible Expense:</strong> Not tied to a fixed trip budget. Allows you to choose exactly which members you want to split this with (or keep it solely for yourself).
            </div>
          ) : (
            <div className="mt-2.5 p-3 bg-teal-50/80 border border-teal-200/60 rounded-xl text-[11px] text-teal-900 leading-relaxed">
              <strong>Shared Trip Budget Expense:</strong> Added through the trip dashboard. Automatically split equally among all {allTripMembers.length} trip group members and deducted from the overall trip fund.
            </div>
          )}
        </div>

        {/* AMOUNT & CURRENCY */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Amount Incurred
          </label>
          <div className="flex items-stretch gap-2.5">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border border-slate-200 rounded-2xl px-3 text-xs font-bold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shrink-0"
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {currCode !== 'INR' && (
            <div className="mt-2 flex items-center justify-between text-xs text-teal-800 bg-teal-50/70 border border-teal-200/50 rounded-xl px-3 py-1.5">
              <span>{currCode} {numAmount} → <strong>₹{convertedAmount.toLocaleString()} INR</strong></span>
              <span className="text-[10px] text-teal-600 font-mono">1 {currCode} = ₹{rate}</span>
            </div>
          )}
        </div>

        {/* CATEGORY SELECTOR */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition flex flex-col items-center gap-0.5 ${
                  category === c
                    ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-base">{catIcons[c]}</span>
                <span className="truncate w-full text-[11px]">{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MERCHANT / DESCRIPTION */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Merchant / Description
          </label>
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="e.g. Souvenirs, Taxi, Coffee, Dinner"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* WHO PAID */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Paid By
          </label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {availableMembers.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* CONDITIONAL SPLIT CONTROLS */}
        {expenseType === 'personal' ? (
          /* PERSONAL MODE: CHOOSE MEMBERS TO SPLIT WITH */
          <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950">
                Select Members to Split With ({personalSplitMembers.length})
              </span>
              <span className="text-xs font-bold text-indigo-700">
                {personalSplitMembers.length === 1 ? 'Personal (100% You)' : `₹${personalPerPerson} / person`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {availableMembers.map((m) => {
                const isSelected = personalSplitMembers.includes(m)
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => togglePersonalMember(m)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-white text-indigo-900 shadow-xs ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white/60 text-slate-500 hover:bg-white'
                    }`}
                  >
                    <span className="truncate">{m}</span>
                    <span className="text-sm">{isSelected ? '✓' : '+'}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-indigo-600">
              💡 Select only the specific people sharing this cost. Not counted against the group trip budget.
            </p>
          </div>
        ) : (
          /* SHARED TRIP MODE: AUTOMATICALLY SPLIT ACROSS ALL GROUP MEMBERS */
          <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-950">
                Split Across All Group Members ({allTripMembers.length})
              </span>
              <span className="text-xs font-extrabold text-teal-800">
                ₹{tripPerPerson} / member
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {allTripMembers.map((m) => (
                <span
                  key={m}
                  className="bg-white text-teal-900 border border-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs"
                >
                  ✓ {m}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-teal-700">
              Allocated equally by largest-remainder rule and deducted from total trip budget.
            </p>
          </div>
        )}

        {/* DATE PICKER */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="button"
          onClick={handleSave}
          className={`w-full py-3.5 text-white font-bold rounded-2xl shadow-md transition text-xs ${
            expenseType === 'personal'
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-700/20'
              : 'bg-teal-600 hover:bg-teal-700 shadow-teal-700/20'
          }`}
        >
          {expenseType === 'personal'
            ? `Save Personal Expense (${personalSplitMembers.length} ${personalSplitMembers.length === 1 ? 'person' : 'people'})`
            : `Save Shared Trip Expense (Split ${allTripMembers.length} ways)`}
        </button>
      </div>
    </div>
  )
}
