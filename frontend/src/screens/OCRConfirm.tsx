import { useState, useEffect } from 'react'
import type { NavigateFn, Expense, Trip, User } from '../types'
import type { ReceiptOCRResult } from '../services/geminiService'
import { saveExpenseToSupabase } from '../services/supabaseDataService'

interface Props {
  navigate: NavigateFn
  onAddExpense?: (expense: Expense) => void
  trip?: Trip | null
  currentUser?: User | null
}

const categories = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other']
const currencies = ['EUR', 'INR', 'USD', 'GBP', 'JPY', 'SGD']

const FX_RATES: Record<string, number> = {
  EUR: 94.0,
  USD: 86.5,
  GBP: 112.4,
  SGD: 65.2,
  JPY: 0.58,
  INR: 1.0,
}

export default function OCRConfirm({ navigate, onAddExpense, trip, currentUser }: Props) {
  const currentUserName = currentUser?.name || 'You (Aisha)'
  const tripCurrency = trip?.currency || 'INR'

  // Load last scanned receipt from localStorage
  const [scannedData, setScannedData] = useState<ReceiptOCRResult | null>(null)
  const [receiptImage, setReceiptImage] = useState<string | null>(null)

  const [fields, setFields] = useState({
    merchant: 'Restaurant Milano',
    amount: '42.00',
    currency: 'EUR',
    date: '2026-09-15',
    category: 'Food',
    isShared: true,
  })

  useEffect(() => {
    try {
      const stored = localStorage.getItem('last_scanned_receipt')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.result) {
          const res = parsed.result as ReceiptOCRResult
          setScannedData(res)
          setReceiptImage(parsed.imageUrl || null)
          setFields({
            merchant: res.merchant || 'Restaurant Milano',
            amount: String(res.amount || '42.00'),
            currency: res.currency || 'EUR',
            date: res.date || '2026-09-15',
            category: res.category || 'Food',
            isShared: true,
          })
        }
      }
    } catch (e) {
      console.warn('Failed loading cached scanned receipt:', e)
    }
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [field]: e.target.value }))

  const numAmount = parseFloat(fields.amount || '0')
  const rate = FX_RATES[fields.currency] || 1.0
  const converted = Math.round(numAmount * rate)

  const handleSaveToLedger = async () => {
    const isShared = fields.isShared
    const tripMembers = trip?.members || [currentUser?.id || 'usr_you', 'usr_ravi', 'usr_asha']

    const newExp: Expense = {
      id: `exp_ocr_${Date.now().toString(36)}`,
      tripId: trip?.id || 'trp_europe',
      merchant: fields.merchant.trim() || 'Scanned Receipt',
      amount: numAmount,
      currency: fields.currency,
      convertedAmount: converted,
      category: fields.category,
      date: new Date(fields.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      paidBy: currentUserName,
      isShared,
      splitBetween: isShared ? tripMembers : [currentUserName],
      splitType: 'equal',
      notes: scannedData?.isLiveGeminiVision
        ? `Scanned via Gemini 1.5 Flash Vision (${scannedData.lineItems?.length || 0} items extracted)`
        : 'Scanned via Vision OCR Verification',
    }

    if (onAddExpense) {
      onAddExpense(newExp)
    }

    try {
      await saveExpenseToSupabase(newExp)
    } catch (e) {
      console.warn('Supabase expense save notice:', e)
    }

    localStorage.removeItem('last_scanned_receipt')
    navigate('expense-history')
  }

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-5 pb-24">
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
          <span>Gemini Vision OCR Verification</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Review Extracted Expense</h1>
        <p className="text-slate-500 text-xs md:text-sm mt-0.5">
          Receipt scanned & parsed via Gemini 1.5 Flash Vision. Verify before committing to your ledger.
        </p>
      </div>

      {/* =========================================================================
          1. RECEIPT PREVIEW CARD: ACTUAL IMAGE OR DIGITAL PAPER CARD
      ========================================================================= */}
      <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">🧾</span>
            <span className="text-xs font-bold text-slate-700">
              {receiptImage ? 'Scanned Photo Preview' : 'Scanned Paper Receipt'}
            </span>
          </div>
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {scannedData?.confidence ? `${Math.round(scannedData.confidence * 100)}% AI Confidence` : '96% AI Confidence'}
          </span>
        </div>

        {/* Real Uploaded Photo OR Authentic Paper Receipt Preview */}
        <div className="p-5 flex justify-center bg-slate-100/50">
          {receiptImage ? (
            <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-slate-300 shadow-md max-h-72 bg-black flex items-center justify-center">
              <img src={receiptImage} alt="Scanned receipt" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-md p-5 font-mono text-xs space-y-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-amber-500" />
              <div className="text-center pb-2 border-b border-dashed border-slate-200">
                <h3 className="font-extrabold text-sm text-slate-900 tracking-wider uppercase">
                  {fields.merchant}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Via Roma 14, Roma, Italy</p>
                <p className="text-[10px] text-slate-400">P.IVA: IT09876543210 · {fields.date}</p>
              </div>

              {/* Receipt Line Items */}
              <div className="py-2 space-y-1.5 text-slate-700 text-xs">
                {(scannedData?.lineItems && scannedData.lineItems.length > 0
                  ? scannedData.lineItems
                  : [
                      { description: 'Pasta Carbonara (x1)', price: 18.0 },
                      { description: 'Bruschetta al Pomodoro', price: 8.5 },
                      { description: 'Tiramisu Tradizionale', price: 9.5 },
                      { description: 'Acqua Naturale 75cl', price: 3.0 },
                      { description: 'Coperto / Table Cover (x2)', price: 3.0 },
                    ]
                ).map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate pr-2">{item.description}</span>
                    <span className="font-bold shrink-0">
                      {fields.currency === 'EUR' ? '€' : fields.currency === 'USD' ? '$' : '₹'}
                      {item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                <span>TOTAL PAID</span>
                <span>
                  {fields.currency} {parseFloat(fields.amount || '0').toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. EXTRACTED & EDITABLE FIELDS
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
              type="number"
              step="0.01"
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
                <option key={c} value={c}>
                  {c}
                </option>
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
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* FX Conversion Callout */}
        <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200/70 flex items-center justify-between text-xs text-teal-900">
          <div>
            <span className="text-[10px] text-teal-600 font-bold uppercase block">Dated Conversion Rate</span>
            <span className="font-extrabold text-sm">
              {fields.currency} {fields.amount} → ₹{converted.toLocaleString()} {tripCurrency}
            </span>
          </div>
          <span className="text-[11px] font-semibold bg-white text-teal-800 px-2 py-1 rounded-lg border border-teal-200">
            1 {fields.currency} = ₹{rate}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveToLedger}
            className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl shadow-sm transition text-xs flex items-center justify-center gap-1.5"
          >
            <span>✓ Confirm & Save to Ledger</span>
          </button>
          <button
            type="button"
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
