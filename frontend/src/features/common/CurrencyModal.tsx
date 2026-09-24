import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  defaultHomeCurrency?: string
}

const supportedCurrencies = [
  { code: 'EUR', name: 'Euro (€)', symbol: '€', rateToINR: 94.0 },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$', rateToINR: 86.5 },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£', rateToINR: 112.4 },
  { code: 'SGD', name: 'Singapore Dollar (S$)', symbol: 'S$', rateToINR: 65.2 },
  { code: 'AED', name: 'UAE Dirham (AED)', symbol: 'AED', rateToINR: 23.55 },
  { code: 'THB', name: 'Thai Baht (฿)', symbol: '฿', rateToINR: 2.48 },
  { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥', rateToINR: 0.58 },
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹', rateToINR: 1.0 },
]

export default function CurrencyConverterModal({ isOpen, onClose }: Props) {
  const [amount, setAmount] = useState('50')
  const [fromCode, setFromCode] = useState('EUR')
  const [toCode, setToCode] = useState('INR')
  const [result, setResult] = useState<{
    calculatedAmount: string
    rateString: string
    fromSymbol: string
    toSymbol: string
  } | null>(null)

  if (!isOpen) return null

  const handleCalculate = () => {
    const num = parseFloat(amount) || 0
    if (num <= 0) {
      setResult(null)
      return
    }

    const fromCurr = supportedCurrencies.find((c) => c.code === fromCode) || supportedCurrencies[0]
    const toCurr = supportedCurrencies.find((c) => c.code === toCode) || supportedCurrencies[7]

    // Convert via INR base
    const inrValue = num * fromCurr.rateToINR
    const finalVal = inrValue / toCurr.rateToINR
    const unitRate = fromCurr.rateToINR / toCurr.rateToINR

    setResult({
      calculatedAmount: finalVal.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      rateString: `1 ${fromCurr.code} = ${unitRate.toFixed(4)} ${toCurr.code}`,
      fromSymbol: fromCurr.symbol,
      toSymbol: toCurr.symbol,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full border border-teal-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-teal-700 to-cyan-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl">
              💱
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Quick Currency Converter</h2>
              <p className="text-teal-200 text-xs mt-0.5">Instant live conversion calculation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Amount to Convert
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
            </div>
          </div>

          {/* From & To Currencies */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                From
              </label>
              <select
                value={fromCode}
                onChange={(e) => setFromCode(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {supportedCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                To
              </label>
              <select
                value={toCode}
                onChange={(e) => setToCode(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {supportedCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CALCULATE ONLY BUTTON */}
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm"
          >
            <span>Calculate Conversion Only</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Result Card */}
          {result && (
            <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 animate-in fade-in duration-150">
              <p className="text-xs text-teal-700 font-semibold uppercase tracking-wider">
                Converted Amount
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-teal-900">
                  {result.toSymbol} {result.calculatedAmount}
                </span>
                <span className="text-xs text-teal-700 font-bold">{toCode}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-teal-200/60 flex items-center justify-between text-xs text-teal-700">
                <span>Exchange rate: <strong>{result.rateString}</strong></span>
                <span className="bg-teal-200/60 px-2 py-0.5 rounded-md font-mono text-[10px]">PS-08 fx_rates</span>
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400">
            ℹ️ This tool calculates and displays foreign exchange rates without recording an expense.
          </p>
        </div>
      </div>
    </div>
  )
}
