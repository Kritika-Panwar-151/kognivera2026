import { useState, useEffect } from 'react'
import type { Trip, User, NavigateFn, ItineraryItem } from '../types'
import {
  DISRUPTION_SCENARIOS,
  getDefaultItinerary,
  adaptItineraryWithAI,
  syncAdaptedItinerary,
  type DisruptionScenario,
} from '../features/adaptive-itinerary/adaptiveItineraryEngine'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface Props {
  navigate: NavigateFn
  trip: Trip | null
  currentUser: User | null
}

export default function AdaptiveItineraryScreen({ navigate, trip, currentUser }: Props) {
  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-sm">
          <p className="text-3xl mb-3">🗺️</p>
          <h2 className="text-lg font-bold text-slate-800">No Active Trip Selected</h2>
          <p className="text-xs text-slate-500 mt-1 mb-4">Select or create a trip to view its adaptive itinerary.</p>
          <button
            onClick={() => navigate('trip-dashboard')}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const [selectedDay, setSelectedDay] = useState<number>(1)
  const [items, setItems] = useState<ItineraryItem[]>(() => {
    try {
      const stored = localStorage.getItem(`trip_itinerary_${trip.id}`)
      if (stored) return JSON.parse(stored)
    } catch (e) {
      console.warn('Failed reading stored itinerary:', e)
    }
    return getDefaultItinerary(trip)
  })

  const [isAdapting, setIsAdapting] = useState(false)
  const [activeScenario, setActiveScenario] = useState<DisruptionScenario | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [adaptationSummary, setAdaptationSummary] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [costSavings, setCostSavings] = useState<number>(0)

  const currencySymbol = trip.currency === 'USD' ? '$' : trip.currency === 'EUR' ? '€' : '₹'

  // Listen to remote itinerary updates across devices
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel(`itinerary_sync_${trip.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itinerary_items',
        },
        async () => {
          // Re-fetch items from Supabase when another member adapts
          try {
            const { data: dbItems } = await supabase
              .from('itinerary_items')
              .select('*')
              .order('sort_order', { ascending: true })

            if (dbItems && dbItems.length > 0) {
              const mapped: ItineraryItem[] = dbItems.map((db) => ({
                id: db.item_id,
                tripId: trip.id,
                dayIndex: db.day_index,
                time: db.starts_at || '10:00 AM',
                title: db.title,
                category: (db.item_type || 'activity') as any,
                cost: Number(db.cost || 0),
                currency: db.currency || trip.currency,
                note: db.explanation || '',
                isLocked: db.locked,
                isAdapted: db.status === 'adapted',
                adaptationReason: db.explanation,
              }))
              setItems(mapped)
              setSyncStatus('⚡ Itinerary just synchronized from travel partner!')
              setTimeout(() => setSyncStatus(null), 4000)
            }
          } catch (e) {
            console.warn('Sync itinerary fetch notice:', e)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [trip.id])

  // Trigger AI adaptation
  const handleTriggerAdaptation = async (scenario: DisruptionScenario) => {
    setActiveScenario(scenario)
    setIsAdapting(true)
    setAdaptationSummary(null)

    try {
      const promptToUse = scenario.id === 'custom' && customPrompt ? customPrompt : scenario.suggestedPrompt
      const res = await adaptItineraryWithAI({
        currentItems: items,
        disruptionType: scenario.id,
        disruptionPrompt: promptToUse,
        selectedDay,
        trip,
      })

      setItems(res.adaptedItems)
      setAdaptationSummary(res.adaptationSummary)
      setCostSavings(res.costDiff)
    } catch (e) {
      console.error('Adaptation failed:', e)
    } finally {
      setIsAdapting(false)
    }
  }

  // Accept and Broadcast to Friends Live
  const handleSaveAndBroadcast = async () => {
    setSyncStatus('Broadcasting new plan to group...')
    const res = await syncAdaptedItinerary({
      tripId: trip.id,
      items,
    })

    if (res.success) {
      setSyncStatus('✅ Plan synchronized live across all group phones!')
      setTimeout(() => setSyncStatus(null), 4000)
    } else {
      setSyncStatus('Plan saved locally (ready offline)')
      setTimeout(() => setSyncStatus(null), 3000)
    }
  }

  // Reset to original plan
  const handleReset = () => {
    const original = getDefaultItinerary(trip)
    setItems(original)
    setAdaptationSummary(null)
    setActiveScenario(null)
    setCostSavings(0)
    localStorage.removeItem(`trip_itinerary_${trip.id}`)
    syncAdaptedItinerary({ tripId: trip.id, items: original })
  }

  // Days list
  const availableDays = [1, 2, 3]
  const currentDayItems = items.filter((i) => i.dayIndex === selectedDay)
  const currentDayCost = currentDayItems.reduce((s, i) => s + i.cost, 0)
  const hasAdaptedItems = currentDayItems.some((i) => i.isAdapted)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-5 md:p-6 shadow-md">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-3">
            <button
              onClick={() => navigate('trip-dashboard')}
              className="flex items-center gap-1.5 text-xs text-teal-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition"
            >
              ← Back to Dashboard
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-teal-200 uppercase tracking-wider">
                Real-Time Multi-Device Sync
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="bg-teal-700/80 text-teal-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                  {trip.destination}
                </span>
                <span className="bg-emerald-600/80 text-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Day {selectedDay} of 8
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                <span>🗺️ AI Adaptive Itinerary</span>
              </h1>
              <p className="text-xs text-teal-100/80 mt-1 max-w-lg">
                Dynamic travel re-planning powered by Google Gemini. Automatically adapts when weather changes,
                budget tightens, or delays occur—instantly updated on all friends' devices.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3 text-right self-start sm:self-auto">
              <p className="text-[10px] text-teal-200 uppercase font-semibold">Day {selectedDay} Cost</p>
              <p className="text-xl font-black text-white">
                {currencySymbol}{currentDayCost.toLocaleString()}
              </p>
              <p className="text-[10px] text-teal-200">
                {currentDayItems.length} activities scheduled
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-5">
        {/* Realtime Toast Notification */}
        {syncStatus && (
          <div className="mb-4 p-3.5 bg-emerald-500 text-white text-xs font-bold rounded-2xl shadow-md flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span>{syncStatus}</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">Group Synchronized</span>
          </div>
        )}

        {/* =========================================================================
            DISRUPTION TRIGGER CENTER: AI ADAPTATION SCENARIOS
        ========================================================================= */}
        <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-4 md:p-5 mb-6">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm md:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>⚡ AI Disruption Recovery Engine</span>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  Simulate & Adapt
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Plans don't always go smoothly. Tap any disruption scenario to watch AI re-plan your day in seconds.
              </p>
            </div>
            {hasAdaptedItems && (
              <button
                onClick={handleReset}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                ↺ Reset Plan
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {DISRUPTION_SCENARIOS.map((sc) => {
              const isActive = activeScenario?.id === sc.id
              return (
                <button
                  key={sc.id}
                  onClick={() => handleTriggerAdaptation(sc)}
                  disabled={isAdapting}
                  className={`p-3 rounded-2xl text-left border transition-all relative flex flex-col justify-between ${
                    isActive
                      ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-teal-300 hover:shadow-2xs'
                  } ${isAdapting ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{sc.icon}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          sc.severity === 'high'
                            ? 'bg-rose-100 text-rose-800'
                            : sc.severity === 'medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {sc.severity} impact
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 leading-snug">{sc.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {sc.description}
                    </p>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-teal-700">
                      {isAdapting && isActive ? 'Re-planning...' : 'Adapt Now →'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Custom Prompt Box */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="text-base">💬</span>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Or type custom prompt: e.g. 'We woke up late, need relaxing afternoon cafe under ₹1,000'"
              className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-2 text-slate-800 focus:outline-teal-500"
            />
            <button
              onClick={() =>
                handleTriggerAdaptation({
                  id: 'custom',
                  title: 'Custom Prompt',
                  icon: '🤖',
                  description: customPrompt || 'Custom scenario',
                  severity: 'low',
                  suggestedPrompt: customPrompt || 'Relaxing afternoon plan under ₹1,500',
                })
              }
              disabled={isAdapting || !customPrompt.trim()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-40"
            >
              Ask AI
            </button>
          </div>
        </div>

        {/* =========================================================================
            ADAPTATION RESULT DIFF & BROADCAST ACTION
        ========================================================================= */}
        {adaptationSummary && (
          <div className="mb-6 p-4 rounded-3xl bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-emerald-300 shadow-sm animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">✨</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                      AI Plan Adapted
                    </span>
                    {costSavings > 0 && (
                      <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        Saved {currencySymbol}{costSavings.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-emerald-900 mt-1 font-medium leading-relaxed">
                    {adaptationSummary}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={handleSaveAndBroadcast}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition flex items-center gap-1.5"
                >
                  <span>⚡ Accept & Broadcast to Friends</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            DAY SELECTOR TABS
        ========================================================================= */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {availableDays.map((day) => {
            const isSelected = selectedDay === day
            const dayItemsCount = items.filter((i) => i.dayIndex === day).length
            const dayHasAdapted = items.some((i) => i.dayIndex === day && i.isAdapted)

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Day {day}</span>
                {dayHasAdapted && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" title="AI Adapted" />
                )}
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {dayItemsCount} stops
                </span>
              </button>
            )
          })}
        </div>

        {/* =========================================================================
            ITINERARY TIMELINE ITEMS
        ========================================================================= */}
        <div className="space-y-3.5">
          {currentDayItems.map((item, idx) => {
            const isAdapted = item.isAdapted
            const isLocked = item.isLocked

            const categoryIcons: Record<string, string> = {
              activity: '🎟️',
              meal: '🍽️',
              lodging: '🏨',
              transit: '🚆',
            }

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 md:p-5 transition shadow-2xs ${
                  isAdapted
                    ? 'border-emerald-300 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                    : isLocked
                    ? 'border-slate-200 bg-slate-50/50'
                    : 'border-slate-200 hover:border-teal-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                        isAdapted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isLocked
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-teal-50 text-teal-800'
                      }`}
                    >
                      {categoryIcons[item.category] || '📍'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-slate-500 font-mono">
                          {item.time}
                        </span>

                        {isLocked ? (
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>🔒</span> Locked (Prepaid)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>🔄</span> Flexible (AI Adaptable)
                          </span>
                        )}

                        {isAdapted && (
                          <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>✨</span> AI Adapted
                          </span>
                        )}
                      </div>

                      {/* Title & Strikethrough if Adapted */}
                      <h3 className="text-sm md:text-base font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>

                      {isAdapted && item.originalTitle && (
                        <p className="text-xs text-slate-400 line-through mt-0.5">
                          Was: {item.originalTitle}
                        </p>
                      )}

                      {/* Location & Notes */}
                      {item.location && (
                        <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                          <span>📍</span> {item.location}
                        </p>
                      )}

                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        {item.note}
                      </p>

                      {/* AI Reason for Adaptation */}
                      {isAdapted && item.adaptationReason && (
                        <div className="mt-2.5 p-2 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-1.5">
                          <span>💡</span>
                          <span><strong>Why changed:</strong> {item.adaptationReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cost Display */}
                  <div className="text-left sm:text-right shrink-0 pl-13 sm:pl-0">
                    <p className="text-base font-extrabold text-slate-900">
                      {item.cost === 0 ? 'Free' : `${currencySymbol}${item.cost.toLocaleString()}`}
                    </p>
                    {isAdapted && item.originalCost !== undefined && item.originalCost !== item.cost && (
                      <p className="text-[11px] text-slate-400 line-through">
                        {currencySymbol}{item.originalCost.toLocaleString()}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 capitalize block mt-0.5">
                      {item.category}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Helper Card */}
        <div className="mt-8 p-4 rounded-3xl bg-teal-900 text-white text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-bold">Real-Time Party Coordination</p>
              <p className="text-teal-200 text-[11px] mt-0.5">
                Every adaptation broadcasts to {trip.members?.length || 2} party members. Everyone stays on the exact same schedule and budget.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('trip-dashboard')}
            className="px-4 py-2 bg-white text-teal-900 font-bold rounded-xl text-xs shrink-0 hover:bg-teal-50 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
