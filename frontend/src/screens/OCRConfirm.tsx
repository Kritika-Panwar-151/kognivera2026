import { useState, useEffect } from 'react'
import type { NavigateFn, Expense, Trip, User } from '../types'
import type { ReceiptOCRResult } from '../services/geminiService'
import { saveExpenseToSupabase } from '../services/supabaseDataService'
import { getRegisteredUsers } from '../services/userRegistry'
import { convertCurrency, getCurrencySymbol } from '../services/currencyService'

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
  const registered = getRegisteredUsers()
  const currentUserName = currentUser?.name || 'You (Aisha)'
  const tripCurrency = trip?.currency || 'INR'

  const tripMemberNames: string[] = (trip?.members || ['usr_you', 'usr_ravi', 'usr_asha']).map(
    (id) => {
      if (id === currentUser?.id) return currentUserName
      const found = registered.find((u) => u.id === id)
      return found ? found.name : id
    }
  )
  if (!tripMemberNames.includes(currentUserName)) {
    tripMemberNames.unshift(currentUserName)
  }

  // Load last scanned receipt from localStorage
  const [scannedData, setScannedData] = useState<ReceiptOCRResult | null>(null)
  const [receiptImage, setReceiptImage] = useState<string | null>(null)

  const [fields, setFields] = useState({
    merchant: 'Restaurant Milano',
    amount: '42.00',
    currency: 'EUR',
    date: new Date().toISOString().split('T')[0],
    category: 'Food',
  })

  // Member selection for split
  const [selectedMembers, setSelectedMembers] = useState<string[]>(tripMemberNames)
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [customBreakdown, setCustomBreakdown] = useState<Record<string, string>>({})
  const [paidBy, setPaidBy] = useState(currentUserName)

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
            date: res.date || new Date().toISOString().split('T')[0],
            category: res.category || 'Food',
          })
        }
      }
    } catch (e) {
      console.warn('Failed loading cached scanned receipt:', e)
    }
  }, [])

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [field]: e.target.value }))

  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const numAmount = parseFloat(fields.amount || '0')
  const converted = Math.round(convertCurrency(numAmount, fields.currency, userHomeCurr))

  const activeMembersCount = Math.max(selectedMembers.length, 1)
  const equalSharePerPerson = (converted / activeMembersCount).toFixed(2)

  const totalAllocatedCustom = selectedMembers.reduce(
    (sum, m) => sum + (parseFloat(customBreakdown[m]) || 0),
    0
  )
  const customRemaining = Math.round((converted - totalAllocatedCustom) * 100) / 100

  const toggleMemberSelection = (memberName: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberName)) {
        return prev.length > 1 ? prev.filter((m) => m !== memberName) : prev
      } else {
        return [...prev, memberName]
      }
    })
  }

  const handleSelectAllMembers = () => {
    setSelectedMembers([...tripMemberNames])
  }

  const handleSelectOnlyMe = () => {
    setSelectedMembers([currentUserName])
  }

  const handleSetCustomAmount = (member: string, val: string) => {
    setCustomBreakdown((prev) => ({
      ...prev,
      [member]: val,
    }))
  }

  const handleDistributeEvenly = () => {
    const count = selectedMembers.length || 1
    const share = (converted / count).toFixed(2)
    const newMap: Record<string, string> = {}
    selectedMembers.forEach((m) => {
      newMap[m] = share
    })
    setCustomBreakdown(newMap)
  }

  const getMemberAvatar = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('you') || lower.includes('aisha')) return '👩🏽'
    if (lower.includes('ravi')) return '👨🏽'
    if (lower.includes('asha')) return '👩🏻'
    if (lower.includes('david')) return '👨🏻'
    return '👤'
  }

  const handleSaveToLedger = async () => {
    const isShared = selectedMembers.length > 1

    let splitBreakdown: Record<string, number> | undefined = undefined
    if (splitMode === 'custom') {
      splitBreakdown = {}
      selectedMembers.forEach((m) => {
        splitBreakdown![m] =
          parseFloat(customBreakdown[m]) ||
          Math.round((converted / selectedMembers.length) * 100) / 100
      })
    }

    const newExp: Expense = {
      id: `exp_ocr_${Date.now().toString(36)}`,
      tripId: trip?.id || 'trp_europe',
      merchant: fields.merchant.trim() || 'Scanned Receipt',
      amount: numAmount,
      currency: fields.currency,
      convertedAmount: converted,
      category: fields.category,
      date: new Date(fields.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      paidBy,
      isShared,
      splitBetween: selectedMembers,
      splitType: splitMode,
      splitBreakdown,
      notes: scannedData?.isLiveGeminiVision
        ? `Scanned via Gemini 1.5 Flash Vision (${scannedData.lineItems?.length || 0} items extracted)`
        : 'Scanned via Vision OCR Verification',
    }

    if (onAddExpense) {
      onAddExpense(newExp)
    }

    try {
      await saveExpenseToSupabase(newExp, currentUser?.id)
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
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Review Extracted Expense
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-0.5">
          Verify extracted fields and select which trip members share this expense.
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
            {scannedData?.confidence
              ? `${Math.round(scannedData.confidence * 100)}% AI Confidence`
              : '96% AI Confidence'}
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

        {/* PAID BY */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Who Paid for this?</label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {tripMemberNames.map((m) => (
              <option key={m} value={m}>
                {m} {m === currentUserName ? '(Current User)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* =========================================================================
            SPLIT BILL & MEMBER MULTI-SELECTION SECTION
        ========================================================================= */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide block">
                Split Bill With Members ({selectedMembers.length}/{tripMemberNames.length})
              </span>
              <p className="text-[11px] text-slate-500">
                Choose who shares this expense. Cost is automatically divided in Group Settlement.
              </p>
            </div>

            {/* Quick 1-Tap Select Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAllMembers}
                className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition shadow-2xs"
              >
                👥 All ({tripMemberNames.length})
              </button>
              <button
                type="button"
                onClick={handleSelectOnlyMe}
                className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition shadow-2xs"
              >
                👤 Only Me
              </button>
            </div>
          </div>

          {/* Interactive Member Checkbox Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tripMemberNames.map((member) => {
              const isSelected = selectedMembers.includes(member)
              const avatar = getMemberAvatar(member)

              return (
                <div
                  key={member}
                  onClick={() => toggleMemberSelection(member)}
                  className={`cursor-pointer p-2.5 rounded-xl border transition flex items-center justify-between ${
                    isSelected
                      ? 'border-teal-500 bg-white shadow-2xs ring-1 ring-teal-200'
                      : 'border-slate-200 bg-white/50 text-slate-400 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{avatar}</span>
                    <div className="truncate">
                      <p
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {member}
                      </p>
                      {member === paidBy && (
                        <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded-full">
                          Payer
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs transition ${
                      isSelected
                        ? 'bg-teal-600 text-white'
                        : 'border border-slate-300 bg-slate-100 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                </div>
              )
            })}
          </div>

          {/* Cost Allocation Mode Switcher (Equal vs Custom) */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600">Split Method:</span>
            <div className="flex bg-slate-200 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                className={`px-3 py-1 font-bold rounded-lg transition ${
                  splitMode === 'equal'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚖️ Equal Split
              </button>
              <button
                type="button"
                onClick={() => {
                  setSplitMode('custom')
                  if (Object.keys(customBreakdown).length === 0) {
                    handleDistributeEvenly()
                  }
                }}
                className={`px-3 py-1 font-bold rounded-lg transition ${
                  splitMode === 'custom'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✏️ Custom Split
              </button>
            </div>
          </div>

          {/* Equal Split Live Preview */}
          {splitMode === 'equal' ? (
            <div className="p-3 bg-white rounded-xl border border-teal-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">⚖️</span>
                <span className="text-slate-700 font-medium">
                  Divided equally across <strong>{selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''}</strong>
                </span>
              </div>
              <span className="text-xs font-black text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                ₹{equalSharePerPerson} / person
              </span>
            </div>
          ) : (
            /* Custom Split Inputs */
            <div className="space-y-2 bg-white p-3 rounded-xl border border-indigo-200">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
                <span className="font-bold text-indigo-950">Custom Member Shares (₹ INR)</span>
                <button
                  type="button"
                  onClick={handleDistributeEvenly}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Reset Evenly
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedMembers.map((m) => {
                  const val =
                    customBreakdown[m] !== undefined
                      ? customBreakdown[m]
                      : (converted / selectedMembers.length).toFixed(2)

                  return (
                    <div
                      key={m}
                      className="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <span className="text-xs font-bold text-slate-800 truncate">{m}</span>
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 w-28 shadow-2xs">
                        <span className="text-[11px] font-bold text-slate-400 mr-1">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={val}
                          onChange={(e) => handleSetCustomAmount(m, e.target.value)}
                          className="w-full text-xs font-black text-slate-900 outline-none text-right"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Checksum & Balance Status */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Allocated: <strong>₹{totalAllocatedCustom.toFixed(2)}</strong> / ₹{converted.toFixed(2)}
                </span>
                <span
                  className={`font-black text-xs px-2 py-0.5 rounded-md ${
                    Math.abs(customRemaining) < 0.01
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {Math.abs(customRemaining) < 0.01
                    ? '✓ Balanced'
                    : `Remaining: ₹${customRemaining.toFixed(2)}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveToLedger}
            className="flex-1 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-2xl shadow-sm transition text-xs flex items-center justify-center gap-1.5"
          >
            <span>✓ Confirm & Save to Ledger (₹{converted.toLocaleString()})</span>
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
