import type { NavigateFn } from '../common/types'
import type { ExtractedFields } from './useReceiptOCR'

interface Props {
  fields: ExtractedFields
  updateField: (field: keyof ExtractedFields, value: any) => void
  converted: number
  rate: number
  navigate: NavigateFn
}

const categories = ['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other']
const currencies = ['EUR', 'INR', 'USD', 'GBP']

export default function OCRFieldsForm({ fields, updateField, converted, rate, navigate }: Props) {
  return (
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

      {/* Allocation Toggle */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Expense Allocation</label>
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => updateField('isShared', true)}
            className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              fields.isShared ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>👥 Shared Trip Budget</span>
          </button>
          <button
            type="button"
            onClick={() => updateField('isShared', false)}
            className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              !fields.isShared ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>👤 Personal Expense</span>
          </button>
        </div>
      </div>

      {/* Merchant */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Merchant Name</label>
        <input
          type="text"
          value={fields.merchant}
          onChange={(e) => updateField('merchant', e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {/* Amount & Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Incurred</label>
          <input
            type="text"
            value={fields.amount}
            onChange={(e) => updateField('amount', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
          <select
            value={fields.currency}
            onChange={(e) => updateField('currency', e.target.value)}
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
          <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
          <input
            type="date"
            value={fields.date}
            onChange={(e) => updateField('date', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
          <select
            value={fields.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Conversion Banner */}
      <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200/70 flex items-center justify-between text-xs text-teal-900">
        <div>
          <span className="text-[10px] text-teal-600 font-bold uppercase block">Dated Conversion Rate</span>
          <span className="font-extrabold text-sm">
            {fields.currency} {fields.amount} → ₹{converted.toLocaleString()} INR
          </span>
        </div>
        <span className="text-[11px] font-semibold bg-white text-teal-800 px-2 py-1 rounded-lg border border-teal-200">
          1 {fields.currency} = ₹{rate}
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
  )
}
