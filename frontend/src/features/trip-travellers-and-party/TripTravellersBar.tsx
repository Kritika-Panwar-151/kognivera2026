import type { Trip } from '../common/types'
import { useTripTravellers } from './useTripTravellers'

interface Props {
  trip?: Trip
}

export default function TripTravellersBar({ trip }: Props) {
  const { travellers, adultsCount, childrenCount, totalPartySize, accountsRuleNotice } = useTripTravellers(trip)

  return (
    <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-4 md:p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">👥</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm md:text-base">Trip Travellers & Party</h3>
              <span className="bg-teal-50 text-teal-800 border border-teal-200/60 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {adultsCount} Adults{childrenCount ? ` · ${childrenCount} Children` : ' · 0 Children'}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md">
                Total: {totalPartySize} Travellers
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{accountsRuleNotice}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-bold px-2.5 py-1 rounded-lg">
            ✓ Accounts: Adults Only
          </span>
        </div>
      </div>

      {/* Member Avatars & Names Grid */}
      <div className="flex flex-wrap items-center gap-2.5 pt-3">
        {travellers.map((traveller) => (
          <div
            key={traveller.id}
            className={`flex items-center gap-2 bg-slate-50 border px-3 py-2 rounded-2xl shadow-2xs ${
              traveller.role === 'Host' ? 'border-teal-200/70' : 'border-slate-200/70'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-xs ${
                traveller.role === 'Host'
                  ? 'bg-teal-600 text-white'
                  : traveller.name.includes('Ravi')
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {traveller.avatar}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900 leading-tight">{traveller.name}</span>
                {traveller.role === 'Host' ? (
                  <span className="text-[9px] font-bold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">Admin / Host</span>
                ) : traveller.status === 'pending' ? (
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">⏳ Pending</span>
                ) : (
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">✓ Joined</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                <span>Personal Budget:</span>
                <span className="font-bold text-slate-800">
                  {traveller.personalBudget && traveller.personalBudget > 0
                    ? `₹${traveller.personalBudget.toLocaleString()}`
                    : 'Awaiting input'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {childrenCount > 0 ? (
          <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 px-3 py-2 rounded-2xl">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-base">
              👧
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-950 block leading-tight">
                {childrenCount} {childrenCount === 1 ? 'Child' : 'Children'}
              </span>
              <span className="text-[10px] text-indigo-600 font-medium">Info only · Not in accounts</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-2xl text-[11px] text-slate-400 border border-dashed border-slate-200">
            <span>👶 0 Children registered</span>
          </div>
        )}
      </div>
    </div>
  )
}
