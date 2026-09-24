import React from 'react'

export interface SettlingTarget {
  id: string
  person: string
  avatar: string
  amount: number
  currency: string
  direction: 'you_owe_them' | 'they_owe_you'
  reason: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  item: SettlingTarget | null
  homeSymbol: string
}

export default function SettleConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  homeSymbol,
}: Props) {
  if (!isOpen || !item) return null

  const isDebtor = item.direction === 'you_owe_them'

  const handleConfirmClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onConfirm()
    onClose()
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }

  return (
    <div
      onClick={handleCloseClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-xl shrink-0">
              💳
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Confirm One-Time Settlement
              </h3>
              <p className="text-[11px] text-slate-500">
                {isDebtor ? 'Transfer funds to settle balance' : 'Confirm settlement receipt'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseClick}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-sm transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Amount & Person Card */}
        <div className="bg-linear-to-br from-slate-50 to-teal-50/40 p-4 rounded-2xl border border-teal-100/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Settlement Amount</span>
            <span className="text-2xl font-black text-slate-900">
              {homeSymbol}{item.amount.toLocaleString()} <span className="text-xs font-bold text-slate-500">{item.currency}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-teal-100/60">
            <div className="w-10 h-10 rounded-xl bg-white border border-teal-100 flex items-center justify-center text-xl shrink-0 shadow-2xs">
              {item.avatar}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">
                {isDebtor ? 'Recipient (You Pay To)' : 'Debtor (Received From)'}
              </p>
              <p className="text-sm font-bold text-slate-900">{item.person}</p>
            </div>
          </div>
        </div>

        {/* One-Time Confirmation Warning Note */}
        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/70 flex items-start gap-2.5 text-xs text-amber-900">
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="font-extrabold text-amber-950">One-Time Action Warning</p>
            <p className="text-[11px] text-amber-900/90 leading-relaxed mt-0.5">
              This settlement action can be performed <strong>only once</strong>. Once confirmed,{' '}
              <strong>{homeSymbol}{item.amount.toLocaleString()}</strong> will be permanently recorded as settled with{' '}
              <strong>{item.person}</strong> across all connected devices.
            </p>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleCloseClick}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            className={`flex-1 py-3 text-white font-black rounded-2xl text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isDebtor
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            <span>✓</span>
            <span>Confirm & Settle {homeSymbol}{item.amount.toLocaleString()}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
