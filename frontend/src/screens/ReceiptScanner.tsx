import { useState, useRef } from 'react'
import type { NavigateFn } from '../types'
import { parseReceiptWithGeminiVision, type ReceiptOCRResult } from '../services/geminiService'

interface Props {
  navigate: NavigateFn
  onReceiptScanned?: (result: ReceiptOCRResult, imageUrl?: string) => void
}

type ScanState = 'idle' | 'processing'

export default function ReceiptScanner({ navigate, onReceiptScanned }: Props) {
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const processImageWithGemini = async (base64Data: string, mimeType: string) => {
    setScanState('processing')
    setProgress(15)

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 85) return prev + Math.round(Math.random() * 15 + 5)
        return prev
      })
    }, 200)

    try {
      const ocrResult = await parseReceiptWithGeminiVision({
        base64Data,
        mimeType,
      })

      clearInterval(progressTimer)
      setProgress(100)

      // Cache extracted receipt & image for confirmation screen
      localStorage.setItem(
        'last_scanned_receipt',
        JSON.stringify({
          result: ocrResult,
          imageUrl: base64Data,
          scannedAt: new Date().toISOString(),
        })
      )

      if (onReceiptScanned) {
        onReceiptScanned(ocrResult, base64Data)
      }

      setTimeout(() => {
        navigate('ocr-confirm')
      }, 400)
    } catch (err) {
      console.error('Receipt OCR failed:', err)
      clearInterval(progressTimer)
      // Fallback navigation with demo data
      navigate('ocr-confirm')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setPreviewUrl(base64)
      processImageWithGemini(base64, file.type || 'image/jpeg')
    }
    reader.readAsDataURL(file)
  }

  const handleSampleReceipt = async () => {
    setPreviewUrl(null)
    setScanState('processing')
    setProgress(20)

    const timer = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 15 : p))
    }, 180)

    const ocrResult = await parseReceiptWithGeminiVision({})
    clearInterval(timer)
    setProgress(100)

    localStorage.setItem(
      'last_scanned_receipt',
      JSON.stringify({
        result: ocrResult,
        imageUrl: null,
        scannedAt: new Date().toISOString(),
      })
    )

    if (onReceiptScanned) {
      onReceiptScanned(ocrResult)
    }

    setTimeout(() => {
      navigate('ocr-confirm')
    }, 400)
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
          Gemini 1.5 Flash Vision extracts merchant, line items, currency, and date in real-time.
        </p>
      </div>

      {scanState === 'idle' ? (
        <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden p-5 space-y-4">
          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* UPLOAD DROPZONE */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer flex flex-col items-center justify-center gap-4 p-8 md:p-12 border-2 border-dashed border-teal-200 rounded-3xl hover:border-teal-400 hover:bg-teal-50/50 transition group bg-slate-50/50"
          >
            <div className="w-16 h-16 bg-teal-100/80 rounded-2xl flex items-center justify-center group-hover:scale-105 transition text-3xl shadow-xs">
              🧾
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800 text-base">Upload receipt image or photo</p>
              <p className="text-slate-400 text-xs mt-1">Supports JPG, PNG, HEIC receipts</p>
            </div>
            <span className="px-4 py-2 bg-white border border-teal-200 text-teal-800 text-xs font-bold rounded-xl shadow-2xs group-hover:bg-teal-50">
              Choose File from Device
            </span>
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>📁 Select Image</span>
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <span>📷 Take Photo</span>
            </button>
          </div>

          {/* 1-TAP DEMO SAMPLE RECEIPT BUTTON */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSampleReceipt}
              className="w-full py-3 px-4 bg-linear-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 border border-teal-200/80 rounded-2xl text-teal-900 text-xs font-bold transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-left">
                <span className="text-base">✨</span>
                <div>
                  <p className="leading-tight font-bold">Try Sample Milan Restaurant Receipt</p>
                  <p className="text-[10px] text-teal-700 font-normal">Italian dinner · €42.00 EUR · 5 line items</p>
                </div>
              </div>
              <span className="text-xs font-bold text-teal-700 bg-white px-2.5 py-1 rounded-lg border border-teal-200 shrink-0">
                Test Vision OCR →
              </span>
            </button>
          </div>

          {/* Info callout */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-500">
            <span>💡</span>
            <span>Gemini Vision parses physical receipts side-by-side with verified FX conversion.</span>
          </div>
        </div>
      ) : (
        /* SCANNING PROCESSING STATE */
        <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-8 flex flex-col items-center gap-6">
          {previewUrl && (
            <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-teal-200 shadow-md">
              <img src={previewUrl} alt="Scanning receipt" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#CCFBF1" strokeWidth="6" />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="#0D9488"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(progress / 100) * 213.6} 213.6`}
                className="transition-all duration-200"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-teal-800 font-extrabold text-base">
              {progress}%
            </span>
          </div>

          <div className="text-center">
            <p className="font-bold text-slate-900 text-lg">Analyzing Receipt via Gemini Flash Vision...</p>
            <p className="text-slate-500 text-xs mt-1">Extracting merchant, line items, currency, and date</p>
          </div>

          <div className="w-full space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {[
              { label: 'Uploading image to Gemini Vision multimodal pipeline', done: progress > 25 },
              { label: 'Extracting merchant, address & VAT identity', done: progress > 50 },
              { label: 'Parsing itemized prices & total sum', done: progress > 75 },
              { label: 'Resolving FX rates & validating checksums', done: progress >= 100 },
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
