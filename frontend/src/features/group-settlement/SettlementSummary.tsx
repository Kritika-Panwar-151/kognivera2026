interface Props {
  totalOwedToYou: number
  totalYouOwe: number
  netBalance: number
}

export default function SettlementSummary({ totalOwedToYou, totalYouOwe, netBalance }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2.5 mb-6">
      {/* Total Owed to You */}
      <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-2xs">
        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
          You Are Owed
        </span>
        <span className="text-base md:text-lg font-extrabold text-emerald-800 mt-0.5 block">
          +₹{totalOwedToYou.toLocaleString()}
        </span>
        <span className="text-[10px] text-slate-400 block mt-0.5">to receive</span>
      </div>

      {/* Total You Owe */}
      <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-2xs">
        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
          You Owe
        </span>
        <span className="text-base md:text-lg font-extrabold text-rose-800 mt-0.5 block">
          -₹{totalYouOwe.toLocaleString()}
        </span>
        <span className="text-[10px] text-slate-400 block mt-0.5">to pay</span>
      </div>

      {/* Net Calculated Position */}
      <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-2xs">
        <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
          Net Position
        </span>
        <span
          className={`text-base md:text-lg font-extrabold mt-0.5 block ${
            netBalance >= 0 ? 'text-teal-900' : 'text-rose-700'
          }`}
        >
          {netBalance >= 0 ? '+' : '-'}₹{Math.abs(netBalance).toLocaleString()}
        </span>
        <span className="text-[10px] text-slate-400 block mt-0.5">after math</span>
      </div>
    </div>
  )
}
