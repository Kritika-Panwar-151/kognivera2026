import { useState } from 'react'
import type { NavigateFn } from '../types'

interface Props {
  navigate: NavigateFn
}

type ScanState = 'idle' | 'processing'

export default function ReceiptScanner({ navigate }: Props) {
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)

  const startScan = () => {
    setScanState('processing')
    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 22 + 8
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setTimeout(() => navigate('ocr-confirm'), 500)
      }
      setProgress(Math.min(Math.round(p), 100))
    }, 180)
  }

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-5">
      <button
        onClick={() => navigate('expense-history')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
      >
        ← Back to Expenses
      </button>

      {/* Screen Header */}
      <div>
        <div className="flex items-center gap-1.5 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
          <span>📸</span>
          <span>Receipt Scanner</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Scan Your Receipt</h1>
        <p className="text-slate-500 text-xs md:text-sm mt-0.5">
          Gemini Vision AI extracts merchant, amount, currency, and date in seconds.
        </p>
      </div>

      {scanState === 'idle' ? (
        <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden p-5 space-y-4">
          {/* UPLOAD DROPZONE */}
          <label className="block cursor-pointer">
            <div className="flex flex-col items-center justify-center gap-4 p-8 md:p-12 border-2 border-dashed border-teal-200 rounded-3xl hover:border-teal-400 hover:bg-teal-50/50 transition group bg-slate-50/50">
              <div className="w-16 h-16 bg-teal-100/80 rounded-2xl flex items-center justify-center group-hover:scale-105 transition text-3xl shadow-xs">
                🧾
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-base">Upload receipt image or photo</p>
                <p className="text-slate-400 text-xs mt-1">Supports JPG, PNG, PDF receipts</p>
              </div>
              <span className="px-4 py-2 bg-white border border-teal-200 text-teal-800 text-xs font-bold rounded-xl shadow-2xs group-hover:bg-teal-50">
                Choose File from Device
              </span>
              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={startScan} />
            </div>
          </label>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startScan}
              className="py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>📁 Select Image</span>
            </button>
            <button
              onClick={startScan}
              className="py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <span>📷 Use Camera</span>
            </button>
          </div>

          {/* 1-TAP DEMO SAMPLE RECEIPT BUTTON */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={startScan}
              className="w-full py-3 px-4 bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 border border-teal-200/80 rounded-2xl text-teal-900 text-xs font-bold transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="text-base">✨</span>
                <div>
                  <p className="leading-tight font-bold">Try Sample Milan Restaurant Receipt</p>
                  <p className="text-[10px] text-teal-700 font-normal">Italian dinner · €42.00 EUR · Trattoria line items</p>
                </div>
              </div>
              <span className="text-xs font-bold text-teal-700 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shrink-0">
                Test OCR →
              </span>
            </button>
          </div>

          {/* Info callout */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-500">
            <span>💡</span>
            <span>All scanned fields are verified side-by-side with receipt before saving.</span>
          </div>
        </div>
      ) : (
        /* SCANNING PROCESSING STATE */
        <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-8 flex flex-col items-center gap-6">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#CCFBF1" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="#0D9488" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 213.6} 213.6`}
                className="transition-all duration-200"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-teal-800 font-extrabold text-base">
              {progress}%
            </span>
          </div>

          <div className="text-center">
            <p className="font-bold text-slate-900 text-lg">Analyzing Receipt via Gemini Vision...</p>
            <p className="text-slate-500 text-xs mt-1">Extracting merchant, line items, currency, and date</p>
          </div>

          <div className="w-full space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {[
              { label: 'Detecting text regions & layout', done: progress > 25 },
              { label: 'Extracting merchant & address', done: progress > 50 },
              { label: 'Reading line items & total sum', done: progress > 75 },
              { label: 'Resolving FX rate against PS-08 database', done: progress >= 100 },
            ].map((step) => (
              <div key={step.label} className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    step.done ? 'bg-teal-600 text-white text-[10px] font-bold' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {step.done ? '✓' : '•'}
                </div>
                <span className={`text-xs ${step.done ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
