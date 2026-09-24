import { useState } from 'react'
import type { NavigateFn } from '../types'

interface Props {
  navigate: NavigateFn
}

const categories = [
  { name: 'Food', icon: '🍽️' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Accommodation', icon: '🏨' },
  { name: 'Activities', icon: '⭐' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Other', icon: '📦' },
]

const currencies = ['EUR (€)', 'INR (₹)', 'USD ($)', 'GBP (£)']

const FX_RATES: Record<string, number> = {
  EUR: 94.0,
  USD: 86.5,
  GBP: 112.4,
  INR: 1.0,
}

export default function WhatIf({ navigate }: Props) {
  const [amount, setAmount] = useState('80')
  const [currency, setCurrency] = useState('EUR (€)')
  const [category, setCategory] = useState('Activities')
  const [description, setDescription] = useState('Sunset boat tour in Rome')
  const [simulated, setSimulated] = useState(false)

  const currCode = currency.split(' ')[0]
  const rate = FX_RATES[currCode] || 1.0
  const numAmount = parseFloat(amount) || 0
  const convertedAmount = Math.round(numAmount * rate)

  const tripBudget = 60000
  const currentSpent = 26172
  const daysLeft = 5

  const beforeProjected = 64872
  const afterProjected = beforeProjected + convertedAmount
  const canAfford = afterProjected <= tripBudget
  const extraOver = afterProjected - beforeProjected

  // Recalculated safe daily limit if purchase is made
  const newRemaining = Math.max(0, tripBudget - currentSpent - convertedAmount)
  const newSafeDaily = Math.round(newRemaining / daysLeft)

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-5">
      <button
        onClick={() => navigate('trip-dashboard')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
          <span>🔮</span>
          <span>What-If Budget Simulator</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Can I afford this?</h1>
        <p className="text-slate-500 text-xs md:text-sm mt-0.5">
          Simulate prospective travel expenses before you commit money
        </p>
      </div>

      {/* INPUT FORM CARD */}
      <div className="bg-white rounded-3xl border border-amber-200/80 shadow-sm p-5 md:p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Prospective Expense Details</h2>

        {/* AMOUNT & CURRENCY SELECTOR */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Amount & Currency
          </label>
          <div className="flex items-stretch gap-2.5">
            <select
              value={currency}
              onChange={(e) => { setCurrency(e.target.value); setSimulated(false) }}
              className="border border-slate-200 rounded-2xl px-3 text-xs font-bold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shrink-0"
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setSimulated(false) }}
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          {currCode !== 'INR' && numAmount > 0 && (
            <p className="text-xs text-amber-800 font-medium mt-1.5 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200/60 inline-block">
              ≈ ₹{convertedAmount.toLocaleString()} INR (Rate: 1 {currCode} = ₹{rate})
            </p>
          )}
        </div>

        {/* CATEGORY SELECTOR (RESPONSIVE CHIPS WITH ICONS - NO TEXT OVERFLOW) */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Expense Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((c) => {
              const isSelected = category === c.name
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => { setCategory(c.name); setSimulated(false) }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition flex items-center gap-2 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-2xs font-bold'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-base shrink-0">{c.icon}</span>
                  <span className="truncate">{c.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Activity / Item Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setSimulated(false) }}
            placeholder="e.g. Sunset boat tour or leather jacket"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {/* SIMULATE ACTION */}
        <button
          type="button"
          onClick={() => setSimulated(true)}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-sm transition text-xs flex items-center justify-center gap-2"
        >
          <span>🔮</span>
          <span>Run Financial Simulation</span>
        </button>
      </div>

      {/* SIMULATION RESULTS CARD */}
      {simulated && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-5 md:p-6 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Simulation Impact</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                canAfford ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {canAfford ? '✅ Recommended' : '⚠️ Over Budget Risk'}
            </span>
          </div>

          {/* Amount Incurred Highlight */}
          <div className="p-3.5 bg-slate-50 rounded-2xl text-center border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Simulated Outlay
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              {currCode === 'EUR' ? '€' : currCode === 'USD' ? '$' : '₹'}{numAmount.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-amber-700 block mt-0.5">
              ≈ ₹{convertedAmount.toLocaleString()} INR
            </span>
          </div>

          {/* Before vs After Comparison Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Before Purchase</span>
              <span className="text-sm font-bold text-slate-700 block mt-0.5">Safe Daily: ₹6,765</span>
              <span className="text-xs text-slate-500 block mt-0.5">Projected: ₹{beforeProjected.toLocaleString()}</span>
            </div>

            <div className={`p-3 rounded-2xl border ${canAfford ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <span className={`text-[10px] font-bold uppercase block ${canAfford ? 'text-emerald-700' : 'text-rose-700'}`}>
                After Purchase
              </span>
              <span className={`text-sm font-extrabold block mt-0.5 ${canAfford ? 'text-emerald-800' : 'text-rose-800'}`}>
                Safe Daily: ₹{newSafeDaily.toLocaleString()}
              </span>
              <span className={`text-xs block mt-0.5 ${canAfford ? 'text-emerald-700' : 'text-rose-700'}`}>
                Projected: ₹{afterProjected.toLocaleString()}
              </span>
            </div>
          </div>

          {/* AI Guardian Advice Banner */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>🤖 AI Guardian Advice:</span>
            </p>
            <p className="leading-relaxed">
              {canAfford
                ? `This expense fits comfortably inside your budget. You still retain ₹${newRemaining.toLocaleString()} reserve for the rest of the trip.`
                : `Adding this increases your projected overspend to +₹${(afterProjected - tripBudget).toLocaleString()} INR. To compensate, keep daily spend below ₹${newSafeDaily.toLocaleString()}/day.`}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => navigate('trip-dashboard')}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition shadow-2xs"
            >
              Add to Expense Ledger
            </button>
            <button
              onClick={() => setSimulated(false)}
              className="px-4 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold text-xs transition"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
