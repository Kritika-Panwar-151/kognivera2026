import { useState, useRef } from 'react'
import type { NavigateFn, Expense, Trip, User } from '../types'
import {
  parseNaturalLanguageExpenseWithLLM,
  parseReceiptWithGeminiVision,
  type ReceiptOCRResult,
} from '../services/geminiService'
import { getRegisteredUsers } from '../services/userRegistry'
import { formatUserDualCurrency, convertCurrency, getCurrencySymbol } from '../services/currencyService'

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

  // Dual Entry Mode: 'manual' vs 'ocr'
  const [entryMode, setEntryMode] = useState<'ocr' | 'manual'>('manual')

  const defaultUserCurrency = currentUser?.homeCurrency
    ? `${currentUser.homeCurrency.toUpperCase()} (${currentUser.homeCurrency.toUpperCase() === 'EUR' ? '€' : currentUser.homeCurrency.toUpperCase() === 'USD' ? '$' : currentUser.homeCurrency.toUpperCase() === 'GBP' ? '£' : '₹'})`
    : 'INR (₹)'
  const [currency, setCurrency] = useState(defaultUserCurrency)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [merchant, setMerchant] = useState('')
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [paidBy, setPaidBy] = useState(currentUserName)
  const [notes, setNotes] = useState('')

  // Member Selection for Split: default to all members of the trip
  const [selectedMembers, setSelectedMembers] = useState<string[]>(tripMemberNames)

  // Split Strategy: 'equal' vs 'custom'
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [customBreakdown, setCustomBreakdown] = useState<Record<string, string>>({})

  // OCR Receipt Scanning State
  const [scanState, setScanState] = useState<'idle' | 'processing' | 'done'>('idle')
  const [scanProgress, setScanProgress] = useState(0)
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [scannedResult, setScannedResult] = useState<ReceiptOCRResult | null>(null)
  const [showLineItems, setShowLineItems] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Natural Language AI Parsing State
  const [nlInput, setNlInput] = useState('')
  const [isNlParsing, setIsNlParsing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [aiSummaryBadge, setAiSummaryBadge] = useState<string | null>(null)
  const [aiWarning, setAiWarning] = useState<string | null>(null)

  // Currency & Math calculations
  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const currCode = currency.split(' ')[0]
  const numAmount = parseFloat(amount) || 0
  const convertedAmount = Math.round(convertCurrency(numAmount, currCode, userHomeCurr))

  const activeMembersCount = Math.max(selectedMembers.length, 1)
  const equalSharePerPerson = (convertedAmount / activeMembersCount).toFixed(2)

  const totalAllocatedCustom = selectedMembers.reduce(
    (sum, m) => sum + (parseFloat(customBreakdown[m]) || 0),
    0
  )
  const customRemaining = Math.round((convertedAmount - totalAllocatedCustom) * 100) / 100

  // -------------------------------------------------------------------------
  const [ocrError, setOcrError] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // OCR Scan Handlers (Camera & File Upload)
  // -------------------------------------------------------------------------
  const processImageWithOCR = async (base64Data: string, mimeType?: string) => {
    setScanState('processing')
    setScanProgress(15)
    setOcrError(null)

    const progressTimer = setInterval(() => {
      setScanProgress((prev) => {
        if (prev < 85) return prev + Math.round(Math.random() * 15 + 5)
        return prev
      })
    }, 200)

    try {
      const res = await parseReceiptWithGeminiVision({
        base64Data,
        mimeType: mimeType || 'image/jpeg',
      })

      clearInterval(progressTimer)
      setScanProgress(100)
      setScannedResult(res)
      setScanState('done')

      // Auto-fill form fields
      setMerchant(res.merchant || 'Scanned Merchant')
      setAmount(String(res.amount || '0'))
      if (res.currency.includes('EUR')) setCurrency('EUR (€)')
      else if (res.currency.includes('USD')) setCurrency('USD ($)')
      else if (res.currency.includes('GBP')) setCurrency('GBP (£)')
      else if (res.currency.includes('JPY')) setCurrency('JPY (¥)')
      else if (res.currency.includes('SGD')) setCurrency('SGD (S$)')
      else setCurrency('INR (₹)')

      if (res.date) setDate(res.date)
      if (res.category && categories.includes(res.category)) {
        setCategory(res.category)
      } else {
        setCategory('Food')
      }

      setNotes(
        res.isLiveGeminiVision
          ? `Scanned via Gemini 3.6 Flash Vision (${res.lineItems?.length || 0} line items extracted)`
          : 'Scanned via Vision OCR Verification'
      )
    } catch (err: any) {
      console.error('OCR parsing failed:', err)
      clearInterval(progressTimer)
      setScanState('idle')
      setOcrError(err?.message || 'Could not extract text from receipt image. Please enter details manually.')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setReceiptImage(base64)
      processImageWithOCR(base64, file.type || 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }

  // -------------------------------------------------------------------------
  // Member Selection & Split Handlers
  // -------------------------------------------------------------------------
  const toggleMemberSelection = (memberName: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberName)) {
        // Prevent deselecting everyone
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
    const share = (convertedAmount / count).toFixed(2)
    const newMap: Record<string, string> = {}
    selectedMembers.forEach((m) => {
      newMap[m] = share
    })
    setCustomBreakdown(newMap)
  }

  // -------------------------------------------------------------------------
  // Natural Language Voice & Text Handlers
  // -------------------------------------------------------------------------
  const handleStartVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-IN'
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setNlInput(transcript)
        setIsListening(false)
        handleParseNl(transcript)
      }

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
    } catch (err) {
      console.warn('Speech recognition start failed:', err)
      setIsListening(false)
    }
  }

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

      if (res.isShared && res.splitMembers && res.splitMembers.length > 0) {
        setSelectedMembers(res.splitMembers)
      } else {
        setSelectedMembers([currentUserName])
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

  // -------------------------------------------------------------------------
  // Save & Commit Handlers
  // -------------------------------------------------------------------------
  const handleSave = () => {
    const isShared = selectedMembers.length > 1

    let splitBreakdown: Record<string, number> | undefined = undefined
    if (splitMode === 'custom') {
      splitBreakdown = {}
      selectedMembers.forEach((m) => {
        splitBreakdown![m] =
          parseFloat(customBreakdown[m]) ||
          Math.round((convertedAmount / selectedMembers.length) * 100) / 100
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
      splitBetween: selectedMembers,
      splitType: splitMode,
      splitBreakdown,
      notes,
    }

    if (onAddExpense) {
      onAddExpense(newExp)
    }
    navigate('expense-history')
  }

  const getMemberAvatar = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('you') || lower.includes('aisha')) return '👩🏽'
    if (lower.includes('ravi')) return '👨🏽'
    if (lower.includes('asha')) return '👩🏻'
    if (lower.includes('david')) return '👨🏻'
    return '👤'
  }

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-4 pb-24">
      {/* Top Back Navigation */}
      <button
        onClick={() => navigate('expense-history')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        ← Back to Expenses
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Add Expense
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-0.5">
          Scan paper receipts with Gemini OCR or enter manually with multi-member split
        </p>
      </div>

      {/* =========================================================================
          PROMINENT DUAL-MODE SWITCHER (OCR SCAN VS MANUAL ENTRY)
      ========================================================================= */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-200/80 rounded-2xl gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setEntryMode('ocr')}
          className={`py-3 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            entryMode === 'ocr'
              ? 'bg-white text-teal-800 shadow-sm ring-1 ring-teal-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="text-base">📸</span>
          <span>Scan Receipt (OCR)</span>
        </button>

        <button
          type="button"
          onClick={() => setEntryMode('manual')}
          className={`py-3 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            entryMode === 'manual'
              ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="text-base">✍️</span>
          <span>Manual Entry</span>
        </button>
      </div>

      {/* =========================================================================
          MODE 1: INTEGRATED OCR SCANNER (CAMERA + FILE UPLOAD + DEMO)
      ========================================================================= */}
      {entryMode === 'ocr' && (
        <div className="bg-white rounded-3xl border-2 border-teal-200/90 shadow-sm overflow-hidden p-5 space-y-4 animate-in fade-in duration-200">
          {/* Hidden Device File / Camera Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <h3 className="text-sm font-extrabold text-teal-950">Gemini 1.5 Flash Vision OCR</h3>
                <p className="text-[11px] text-teal-700">Extracts total, merchant, items & currency instantly</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
              Live AI Vision
            </span>
          </div>

          {/* Processing State with Animated Bar */}
          {scanState === 'processing' && (
            <div className="p-6 bg-teal-50/70 border border-teal-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <p className="font-bold text-teal-900 text-sm">Reading Receipt Image with Gemini Flash...</p>
                <p className="text-xs text-teal-600 mt-0.5">Extracting line items, merchant name, and total amount</p>
              </div>
              <div className="w-full bg-teal-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 h-full transition-all duration-200 rounded-full"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Idle State: Camera & Upload Options */}
          {scanState === 'idle' && (
            <div className="space-y-3">
              {/* Dropzone for File Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer flex flex-col items-center justify-center gap-2.5 p-6 border-2 border-dashed border-teal-300 rounded-2xl hover:border-teal-500 hover:bg-teal-50/60 transition group bg-slate-50/60 text-center"
              >
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-2xl group-hover:scale-105 transition shadow-2xs">
                  🧾
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs md:text-sm">Click to Upload Receipt</p>
                  <p className="text-slate-400 text-[11px]">Supports JPG, PNG, HEIC from gallery or desktop</p>
                </div>
              </div>

              {/* Primary Camera & Upload Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="py-3 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="text-base">📷</span>
                  <span>Take Photo (Camera)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-3 bg-white hover:bg-slate-50 border border-teal-200 text-teal-800 rounded-xl font-bold text-xs transition shadow-2xs flex items-center justify-center gap-2"
                >
                  <span className="text-base">📁</span>
                  <span>Upload Image</span>
                </button>
              </div>

              {/* OCR Error Alert (Zero Fake Data) */}
              {ocrError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>{ocrError}</span>
                </div>
              )}
            </div>
          )}

          {/* Done State: Extraction Preview Card & Re-scan Button */}
          {scanState === 'done' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">✅</span>
                  <div>
                    <p className="text-xs font-black text-emerald-950">
                      Receipt Scanned Successfully!
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Form below has been auto-filled with extracted data.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScanState('idle')
                    setReceiptImage(null)
                  }}
                  className="text-[11px] font-bold text-teal-800 bg-white border border-teal-200 hover:bg-teal-50 px-2.5 py-1 rounded-lg transition"
                >
                  🔄 Scan Another
                </button>
              </div>

              {/* Scanned Photo Thumbnail Preview (if taken/uploaded) */}
              {receiptImage && (
                <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-300">
                    <img src={receiptImage} alt="Scanned receipt" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{merchant || 'Scanned Receipt'}</p>
                    <p className="text-[11px] text-slate-500">{currency} {amount} · {date}</p>
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                    {scannedResult?.confidence ? `${Math.round(scannedResult.confidence * 100)}% Confidence` : '96% Confident'}
                  </span>
                </div>
              )}

              {/* Line Items Accordion */}
              {scannedResult?.lineItems && scannedResult.lineItems.length > 0 && (
                <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/70 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowLineItems((v) => !v)}
                    className="w-full flex items-center justify-between font-bold text-slate-700"
                  >
                    <span>🧾 Extracted Line Items ({scannedResult.lineItems.length})</span>
                    <span>{showLineItems ? '▲ Hide' : '▼ View'}</span>
                  </button>
                  {showLineItems && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1 font-mono text-[11px]">
                      {scannedResult.lineItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-600">
                          <span className="truncate pr-2">{item.description}</span>
                          <span className="font-bold text-slate-900 shrink-0">
                            {currency.split(' ')[0]} {item.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2: AI VOICE & NATURAL LANGUAGE BAR (FOR QUICK MANUAL ENTRY)
      ========================================================================= */}
      {entryMode === 'manual' && (
        <div className="bg-gradient-to-br from-indigo-50 via-teal-50 to-emerald-50 border border-indigo-200/80 rounded-3xl p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base">✨</span>
              <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                Quick Voice / AI Entry
              </span>
            </div>
            <span className="text-[10px] font-bold bg-indigo-200/70 text-indigo-900 px-2 py-0.5 rounded-full">
              Gemini Assistant
            </span>
          </div>

          <p className="text-[11px] text-slate-600 mb-2">
            Speak or type: e.g. "add 1200 rupees dinner, split with Asha and Ravi"
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleParseNl()
                }}
                placeholder="Type or click mic to speak..."
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

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={handleStartVoice}
              className={`p-2.5 rounded-2xl text-xs font-bold transition shadow-xs flex items-center justify-center shrink-0 ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-indigo-200'
              }`}
              title={isListening ? 'Listening...' : 'Click to Speak'}
            >
              <span>{isListening ? '🔴' : '🎙️'}</span>
            </button>

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
                <span>Parse</span>
              )}
            </button>
          </div>

          {aiSummaryBadge && (
            <div className="mt-2.5 p-2 bg-emerald-100/90 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-semibold flex items-center justify-between">
              <span>✨ {aiSummaryBadge}</span>
              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                Auto-Filled
              </span>
            </div>
          )}

          {aiWarning && (
            <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-xs font-medium flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{aiWarning}</span>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          UNIVERSAL EXPENSE FORM (AMOUNT, MERCHANT, CATEGORY, DATE, PAID BY)
      ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 md:p-6 space-y-4">
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
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {(() => {
            const userHomeCurr = currentUser?.homeCurrency || 'INR'
            const tripDestCurr = trip?.currency || 'JPY'
            const dualFX = formatUserDualCurrency(numAmount, currCode, userHomeCurr, tripDestCurr)
            return (
              <div className="mt-2 p-3 bg-teal-50/90 border border-teal-200/80 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider block">
                    User Home Currency ({userHomeCurr})
                  </span>
                  <span className="font-black text-sm text-teal-950">
                    {dualFX.primary}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider block">
                    Trip Destination ({tripDestCurr})
                  </span>
                  <span className="text-xs font-bold text-teal-800 bg-white px-2 py-0.5 rounded-lg border border-teal-200 shadow-2xs">
                    {dualFX.secondary}
                  </span>
                </div>
              </div>
            )
          })()}
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
            placeholder="e.g. Souvenirs, Taxi, Coffee, Trattoria Romano"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
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
                    ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-base">{catIcons[c]}</span>
                <span className="truncate w-full text-[11px]">{c}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PAID BY SELECTOR */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Who Paid for this?
          </label>
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
        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide block">
                Split Bill With Members ({selectedMembers.length}/{tripMemberNames.length})
              </span>
              <p className="text-[11px] text-slate-500">
                Choose who shares this expense. Debts track automatically in Group Settlement.
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
                      : (convertedAmount / selectedMembers.length).toFixed(2)

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
              : category.toLowerCase().includes('stay') ||
                category.toLowerCase().includes('accommodation')
              ? trip.categoryCaps.accommodation
              : category.toLowerCase().includes('transport')
              ? trip.categoryCaps.transport
              : category.toLowerCase().includes('activit')
              ? trip.categoryCaps.activities
              : trip.categoryCaps.misc
            : 15000) && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-rose-950 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <div>
                <p className="font-bold">Category Cap Breach Alert</p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  This spend pushes {category} past the designated cap.
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
          <label className="block text-xs font-semibold text-slate-600 mb-1">Expense Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-2xl shadow-md transition text-xs flex items-center justify-center gap-2 shadow-teal-700/20"
        >
          <span>✓</span>
          <span>
            Save & Split Expense (₹{convertedAmount.toLocaleString()} ·{' '}
            {selectedMembers.length === 1 ? 'Solo' : `${selectedMembers.length} ways`})
          </span>
        </button>
      </div>
    </div>
  )
}
