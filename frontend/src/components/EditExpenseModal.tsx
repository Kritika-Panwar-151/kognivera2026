import { useState } from 'react'
import type { Expense } from '../types'
import { convertCurrency, getCurrencySymbol } from '../services/currencyService'

interface Props {
  expense: Expense
  isOpen: boolean
  onClose: () => void
  onSave: (updated: Expense) => void
}

const categories = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other']
const currencies = ['INR', 'EUR', 'USD', 'GBP', 'CHF', 'JPY', 'SGD', 'AED', 'THB']

export default function EditExpenseModal({ expense, isOpen, onClose, onSave }: Props) {
  if (!isOpen) return null

  const [merchant, setMerchant] = useState(expense.merchant)
  const [amount, setAmount] = useState(String(expense.amount))
  const [currency, setCurrency] = useState(expense.currency || 'INR')
  const [category, setCategory] = useState(expense.category || 'Food')
  const [date, setDate] = useState(expense.date || new Date().toISOString().split('T')[0])
  const [isShared, setIsShared] = useState<boolean>(
    Boolean(expense.isShared && expense.splitBetween && expense.splitBetween.length > 1)
  )

  const numAmount = parseFloat(amount) || 0
  const convertedAmount = Math.round(convertCurrency(numAmount, currency, 'INR'))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchant.trim() || numAmount <= 0) return

    const updatedSplit = isShared
      ? (expense.splitBetween && expense.splitBetween.length > 1 ? expense.splitBetween : [paidBy, 'Ravi'])
      : [paidBy]

    const updated: Expense = {
      ...expense,
      merchant: merchant.trim(),
      amount: numAmount,
      currency,
      convertedAmount,
      category,
      date,
      paidBy,
      isShared,
      splitBetween: updatedSplit,
    }

    onSave(updated)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-teal-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-teal-50 via-white to-cyan-50 border-b border-teal-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Edit Expense</h3>
              <p className="text-[11px] text-slate-500">ID: {expense.id.slice(0, 16)}...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Merchant / Description
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currency !== 'INR' && (
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
              <span>Converted (1 {currency} = ₹{rate}):</span>
              <strong className="font-extrabold text-amber-950">₹{convertedAmount.toLocaleString()} INR</strong>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Paid By
            </label>
            <input
              type="text"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {/* Expense Classification Segmented Control */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Expense Type
            </label>
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setIsShared(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  !isShared
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👤</span>
                <span>Personal (Only Me)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShared(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  isShared
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>👥</span>
                <span>Group Shared</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
