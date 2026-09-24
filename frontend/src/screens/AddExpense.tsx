import { useState } from 'react'
import type { NavigateFn, Expense, Trip, User } from '../types'
import { parseNaturalLanguageExpenseWithLLM } from '../services/geminiService'
import { getRegisteredUsers } from '../services/userRegistry'

interface Props {
  navigate: NavigateFn
  onAddExpense?: (expense: Expense) => void
  trip?: Trip | null
  currentUser?: User | null
}

const categories = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other']
const currencies = ['INR (₹)', 'EUR (€)', 'USD ($)', 'GBP (£)', 'JPY (¥)', 'SGD (S$)']

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

export default function AddExpense({ navigate, onAddExpense, trip, currentUser }: Props) {
  // Resolve member display names from trip.members or registered users
  const registered = getRegisteredUsers()
  const currentUserName = currentUser?.name || 'You (Aisha)'
  
  const tripMemberNames: string[] = (trip?.members || ['usr_you', 'usr_ravi', 'usr_asha']).map((id) => {
    if (id === currentUser?.id) return currentUserName
    const found = registered.find((u) => u.id === id)
    return found ? found.name : id
  })
  if (!tripMemberNames.includes(currentUserName)) {
    tripMemberNames.unshift(currentUserName)
  }

  // Classification: 'shared' (trip dashboard expense, split across all trip members) vs 'personal' (flexible personal, select specific people to split with)
  const [expenseType, setExpenseType] = useState<'personal' | 'shared'>('personal')
  const [amount, setAmount] = useState('1200')
  const [currency, setCurrency] = useState('INR (₹)')
  const [category, setCategory] = useState('Food')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState('2026-09-16')
  const [paidBy, setPaidBy] = useState(currentUserName)
  const [personalSplitMembers, setPersonalSplitMembers] = useState<string[]>([currentUserName])
  const [notes, setNotes] = useState('')

  // Natural Language AI Parsing State
  const [nlInput, setNlInput] = useState('')
  const [isNlParsing, setIsNlParsing] = useState(false)
  const [aiSummaryBadge, setAiSummaryBadge] = useState<string | null>(null)
  const [aiWarning, setAiWarning] = useState<string | null>(null)

  const handleParseNl = async (textToParse?: string) => {
    const text = textToParse || nlInput
    if (!text.trim()) return
    setIsNlParsing(true)
    setAiWarning(null)
    setAiSummaryBadge(null)

    try {
      const res = await parseNaturalLanguageExpenseWithLLM({
        text,
        availableMembers: tripMemberNames,
        currentUser: { id: currentUser?.id || 'usr_you', name: currentUserName },
        defaultCurrency: trip?.currency || 'INR',
        tripBudget: trip?.budget || 60000,
      })

      setAmount(String(res.amount))
      if (res.currency.includes('EUR')) setCurrency('EUR (€)')
      else if (res.currency.includes('USD')) setCurrency('USD ($)')
      else if (res.currency.includes('GBP')) setCurrency('GBP (£)')
      else setCurrency('INR (₹)')

      setCategory(res.category)
      setMerchant(res.merchant)
      setPaidBy(res.paidBy)

      if (res.isShared) {
        setExpenseType('personal')
        setPersonalSplitMembers(res.splitMembers)
      } else {
        setExpenseType('personal')
        setPersonalSplitMembers([currentUserName])
      }

      setAiSummaryBadge(res.summary)
      if (res.warning) {
        setAiWarning(res.warning)
      }
    } catch (e) {
      console.warn('NLP parse error:', e)
    } finally {
      setIsNlParsing(false)
    }
  }

  const currCode = currency.split(' ')[0]
  const numAmount = parseFloat(amount) || 0
  const rate = FX_RATES[currCode] || 1.0
  const convertedAmount = Math.round(numAmount * rate)

  // Trip members for shared trip budget expenses
  const allTripMembers = tripMemberNames
  const tripPerPerson = (convertedAmount / Math.max(allTripMembers.length, 1)).toFixed(2)

  // Personal split calculation
  const personalCount = Math.max(personalSplitMembers.length, 1)
  const personalPerPerson = (convertedAmount / personalCount).toFixed(2)

  // Split Strategy: 'equal' vs 'custom'
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [customBreakdown, setCustomBreakdown] = useState<Record<string, string>>({})

  const activeSplitMembers = expenseType === 'shared' ? allTripMembers : personalSplitMembers

  const totalAllocatedCustom = activeSplitMembers.reduce(
    (sum, m) => sum + (parseFloat(customBreakdown[m]) || 0),
    0
  )
  const customRemaining = Math.round((convertedAmount - totalAllocatedCustom) * 100) / 100

  const handleSetCustomAmount = (member: string, val: string) => {
    setCustomBreakdown((prev) => ({
      ...prev,
      [member]: val,
    }))
  }

  const handleDistributeEvenly = () => {
    const count = activeSplitMembers.length || 1
    const share = (convertedAmount / count).toFixed(2)
    const newMap: Record<string, string> = {}
    activeSplitMembers.forEach((m) => {
      newMap[m] = share
    })
    setCustomBreakdown(newMap)
  }

  const togglePersonalMember = (m: string) => {
    setPersonalSplitMembers((prev) => {
      if (prev.includes(m)) {
        return prev.length > 1 ? prev.filter((x) => x !== m) : prev
      } else {
        return [...prev, m]
      }
    })
  }

  const handleSave = () => {
    const isShared = expenseType === 'shared'
    const splitBetween = isShared ? allTripMembers : personalSplitMembers

    let splitBreakdown: Record<string, number> | undefined = undefined
    if (splitMode === 'custom') {
      splitBreakdown = {}
      splitBetween.forEach((m) => {
        splitBreakdown![m] =
          parseFloat(customBreakdown[m]) || Math.round((convertedAmount / splitBetween.length) * 100) / 100
      })
    }

    const newExp: Expense = {
      id: `exp_${Date.now().toString(36)}`,
      tripId: trip?.id || 'trp_europe',
      merchant: merchant.trim() || `${category} Spend`,
      amount: numAmount,
      currency: currCode,
      convertedAmount,
      category,
      date: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      paidBy,
      isShared,
      splitBetween,
      splitType: splitMode,
      splitBreakdown,
      notes,
    }

    if (onAddExpense) {
      onAddExpense(newExp)
    }
    navigate('expense-history')
  }

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-4">
      <button
        onClick={() => navigate('expense-history')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        ← Back to Expenses
      </button>

      {/* Header with Quick Scan Button */}
      <div className="flex items-center justify-between gap-3">
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

      {/* =========================================================================
          LIFT 2: AI NATURAL LANGUAGE PROMPT BAR (WITH ANTI-HALLUCINATION GUARDRAILS)
      ========================================================================= */}
      <div className="bg-gradient-to-br from-indigo-50 via-teal-50 to-emerald-50 border border-indigo-200/80 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">✨</span>
            <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
              AI Natural-Language Entry
            </span>
          </div>
          <span className="text-[10px] font-bold bg-indigo-200/70 text-indigo-900 px-2 py-0.5 rounded-full">
            Gemini Powered
          </span>
        </div>

        <p className="text-[11px] text-slate-600 mb-2.5">
          Type or speak naturally. AI extracts merchant, amount, category, and splits automatically.
        </p>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleParseNl()
              }}
              placeholder="e.g. 'add 1200 rupees dinner, split with Asha and Ravi'"
              className="w-full bg-white border border-indigo-200 rounded-2xl pl-3.5 pr-8 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {nlInput && (
              <button
                type="button"
                onClick={() => setNlInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleParseNl()}
            disabled={isNlParsing || !nlInput.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 shrink-0"
          >
            {isNlParsing ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Parsing...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Parse</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Chips */}
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <span className="text-[10px] text-slate-400 font-semibold">Try sample:</span>
          <button
            type="button"
            onClick={() => {
              const sample = 'add 1200 rupees dinner, split with Asha and Ravi'
              setNlInput(sample)
              handleParseNl(sample)
            }}
            className="text-[10px] bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 px-2 py-0.5 rounded-lg transition font-medium"
          >
            🍽️ 1200 rs dinner split Asha & Ravi
          </button>
          <button
            type="button"
            onClick={() => {
              const sample = 'paid 45 euros airport taxi for everyone'
              setNlInput(sample)
              handleParseNl(sample)
            }}
            className="text-[10px] bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 px-2 py-0.5 rounded-lg transition font-medium"
          >
            🚕 45 eur taxi for everyone
          </button>
          <button
            type="button"
            onClick={() => {
              const sample = '350 inr coffee for myself'
              setNlInput(sample)
              handleParseNl(sample)
            }}
            className="text-[10px] bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 px-2 py-0.5 rounded-lg transition font-medium"
          >
            ☕ 350 inr coffee personal
          </button>
        </div>

        {/* AI Extracted Banner */}
        {aiSummaryBadge && (
          <div className="mt-3 p-2.5 bg-emerald-100/80 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <span>✨ {aiSummaryBadge}</span>
            <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
              Form Auto-Filled
            </span>
          </div>
        )}

        {/* Anti-Hallucination Guardrail Alert */}
        {aiWarning && (
          <div className="mt-2.5 p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
            <span>⚠️</span>
            <span>{aiWarning}</span>
          </div>
        )}
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

        {/* SPLIT STRATEGY CONTROLS (EQUAL VS CUSTOM SPLIT) */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Cost Allocation Mode
              </span>
              <p className="text-[10px] text-slate-400">
                Choose equal distribution or enter custom decimal shares per person
              </p>
            </div>

            {/* Split Mode Segmented Switch */}
            <div className="flex bg-slate-200/80 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
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
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  splitMode === 'custom'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✏️ Custom Split
              </button>
            </div>
          </div>

          {/* Member Selection for Personal Mode */}
          {expenseType === 'personal' && (
            <div className="space-y-2 pt-1 border-t border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-600 block">
                Select Members in Split ({personalSplitMembers.length})
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {availableMembers.map((m) => {
                  const isSelected = personalSplitMembers.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => togglePersonalMember(m)}
                      className={`p-2 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-white text-indigo-900 shadow-2xs ring-1 ring-indigo-200'
                          : 'border-slate-200 bg-white/60 text-slate-500 hover:bg-white'
                      }`}
                    >
                      <span className="truncate">{m}</span>
                      <span className="text-xs">{isSelected ? '✓' : '+'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Split Mode Content */}
          {splitMode === 'equal' ? (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚖️</span>
                <span className="text-slate-700 font-medium">
                  Divided equally across <strong>{activeSplitMembers.length} member{activeSplitMembers.length > 1 ? 's' : ''}</strong>
                </span>
              </div>
              <span className="text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                ₹{(convertedAmount / Math.max(activeSplitMembers.length, 1)).toFixed(2)} / person
              </span>
            </div>
          ) : (
            /* Custom Split Inputs */
            <div className="space-y-2.5 bg-white p-3.5 rounded-xl border border-indigo-200">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                <span className="font-bold text-indigo-950">Custom Member Shares (INR ₹)</span>
                <button
                  type="button"
                  onClick={handleDistributeEvenly}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                >
                  Reset Evenly
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeSplitMembers.map((m) => {
                  const val =
                    customBreakdown[m] !== undefined
                      ? customBreakdown[m]
                      : (convertedAmount / activeSplitMembers.length).toFixed(2)

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
                  Allocated: <strong>₹{totalAllocatedCustom.toFixed(2)}</strong> / ₹{convertedAmount.toFixed(2)}
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

        {/* CATEGORY CAP BREACH PREVIEW WARNING */}
        {convertedAmount >
          (trip?.categoryCaps
            ? category.toLowerCase().includes('food')
              ? trip.categoryCaps.food
              : category.toLowerCase().includes('stay') || category.toLowerCase().includes('accommodation')
              ? trip.categoryCaps.accommodation
              : category.toLowerCase().includes('transport')
              ? trip.categoryCaps.transport
              : category.toLowerCase().includes('activit')
              ? trip.categoryCaps.activities
              : trip.categoryCaps.misc
            : 15000) && (
          <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-950 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <div>
                <p className="font-black">Category Cap Breach Alert</p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  This expense ({currCode} {numAmount} → ₹{convertedAmount.toLocaleString()}) pushes {category} spend past the allocated category cap!
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full shrink-0">
              Cap Exceeded
            </span>
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
