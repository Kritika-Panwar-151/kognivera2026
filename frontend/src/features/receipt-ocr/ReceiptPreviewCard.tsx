export default function ReceiptPreviewCard() {
  return (
    <div className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden mb-6">
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
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-amber-500" />

          <div className="text-center pb-2 border-b border-dashed border-slate-200">
            <h3 className="font-extrabold text-sm text-slate-900 tracking-wider">RESTAURANT MILANO</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Via Roma 14, 00184 Roma, Italy</p>
            <p className="text-[10px] text-slate-400">P.IVA: IT09876543210</p>
          </div>

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

          <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-100">
            <p>15/09/2026 · 19:43:20 · POS #04</p>
            <p className="font-sans font-bold text-slate-500 mt-0.5">Grazie per la visita!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
