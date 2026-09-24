import { useState } from 'react'
import type { NavigateFn } from '../types'

interface Props {
  navigate: NavigateFn
}

const categories = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other']
const currencies = ['EUR', 'INR', 'USD', 'GBP']

export default function OCRConfirm({ navigate }: Props) {
  const [fields, setFields] = useState({
    merchant: 'Restaurant Milano',
    amount: '42.00',
    currency: 'EUR',
    date: '2026-09-15',
    category: 'Food',
    isShared: true,
  })

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [field]: e.target.value }))

  const numAmount = parseFloat(fields.amount || '0')
  const rate = fields.currency === 'EUR' ? 94 : fields.currency === 'USD' ? 86.5 : 1
  const converted = Math.round(numAmount * rate)

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-5">
      {/* Back button */}
      <button
        onClick={() => navigate('receipt-scanner')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        ← Back to Scanner
      </button>

      {/* Screen Header */}
      <div>
        <div className="flex items-center gap-1.5 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
          <span>⚡</span>
          <span>AI Vision OCR Verification</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Review Extracted Expense</h1>
        <p className="text-slate-500 text-xs md:text-sm mt-0.5">
          Receipt scanned & parsed via Gemini Vision. Verify before committing to your ledger.
        </p>
      </div>

      {/* =========================================================================
          1. PROPER RECEIPT PREVIEW CARD (FITS SCREEN WIDTH NATURALLY)
      ========================================================================= */}
      <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🧾</span>
            <span className="text-xs font-bold text-slate-700">Scanned Paper Receipt</span>
          </div>
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            96% AI Confidence
          </span>
        </div>

        {/* Authentic Paper Receipt Body */}
        <div className="p-5 flex justify-center bg-slate-100/50">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-md p-5 font-mono text-xs space-y-2 relative overflow-hidden">
            {/* Serrated Receipt Top Decorator */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-amber-500" />

            <div className="text-center pb-2 border-b border-dashed border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900 tracking-wider">RESTAURANT MILANO</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Via Roma 14, 00184 Roma, Italy</p>
              <p className="text-[10px] text-slate-400">P.IVA: IT09876543210</p>
            </div>

            {/* Receipt Line Items */}
            <div className="py-2 space-y-1.5 text-slate-700 text-xs">
              <div className="flex justify-between">
                <span>Pasta Carbonara (x1)</span>
                <span className="font-bold">€18.00</span>
              </div>
              <div className="flex justify-between">
                <span>Bruschetta al Pomodoro</span>
                <span className="font-bold">€8.50</span>
              </div>
              <div className="flex justify-between">
                <span>Tiramisu Tradizionale</span>
                <span className="font-bold">€9.50</span>
              </div>
              <div className="flex justify-between">
                <span>Acqua Naturale 75cl</span>
                <span className="font-bold">€3.00</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Coperto / Table Cover (x2)</span>
                <span>€3.00</span>
              </div>
            </div>

            {/* Total Section */}
            <div className="pt-2 border-t-2 border-dashed border-slate-300">
              <div className="flex justify-between items-baseline font-sans">
                <span className="font-extrabold text-sm text-slate-900">TOTALE DOVUTO:</span>
                <span className="font-extrabold text-lg text-teal-800">€42.00</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                <span>Home Currency Equiv:</span>
                <span className="font-bold text-slate-700">≈ ₹3,948 INR</span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-100">
              <p>15/09/2026 · 19:43:20 · POS #04</p>
              <p className="font-sans font-bold text-slate-500 mt-0.5">Grazie per la visita!</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. EXTRACTED & EDITABLE FIELDS (COMES RIGHT AFTER RECEIPT PREVIEW)
      ========================================================================= */}
      <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm">✏️</span>
            <h2 className="text-sm font-bold text-slate-900">Extracted Expense Fields</h2>
          </div>
          <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full">
            All Fields Editable
          </span>
        </div>

        {/* Classification: Shared vs Personal */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Expense Allocation
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFields((f) => ({ ...f, isShared: true }))}
              className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                fields.isShared ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>👥 Shared Trip Budget</span>
            </button>
            <button
              type="button"
              onClick={() => setFields((f) => ({ ...f, isShared: false }))}
              className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                !fields.isShared ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>👤 Personal Expense</span>
            </button>
          </div>
        </div>

        {/* Merchant Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Merchant Name
          </label>
          <input
            type="text"
            value={fields.merchant}
            onChange={set('merchant')}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        {/* Amount & Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Amount Incurred
            </label>
            <input
              type="text"
              value={fields.amount}
              onChange={set('amount')}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Currency
            </label>
            <select
              value={fields.currency}
              onChange={set('currency')}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Date
            </label>
            <input
              type="date"
              value={fields.date}
              onChange={set('date')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Category
            </label>
            <select
              value={fields.category}
              onChange={set('category')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* FX Conversion Callout */}
        <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200/70 flex items-center justify-between text-xs text-teal-900">
          <div>
            <span className="text-[10px] text-teal-600 font-bold uppercase block">Dated Conversion Rate</span>
            <span className="font-extrabold text-sm">
              {fields.currency} {fields.amount} → ₹{converted.toLocaleString()} INR
            </span>
          </div>
          <span className="text-[11px] font-semibold bg-white text-teal-800 px-2 py-1 rounded-lg border border-teal-200">
            1 EUR = ₹94.00
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2.5">
          <button
            onClick={() => navigate('expense-history')}
            className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-sm transition text-xs flex items-center justify-center gap-1.5"
          >
            <span>✓ Confirm & Save to Ledger</span>
          </button>
          <button
            onClick={() => navigate('receipt-scanner')}
            className="px-4 py-3.5 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-2xl transition text-xs shrink-0"
          >
            Rescan
          </button>
        </div>
      </div>
    </div>
  )
}
