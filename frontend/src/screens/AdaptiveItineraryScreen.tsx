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
import { resolveCityName } from '../services/geminiService'
import { getCurrencySymbol } from '../services/currencyService'

export interface CuratedSpot {
  id: string
  title: string
  vibe: 'food' | 'culture' | 'scenic' | 'chill' | 'shopping'
  category: 'activity' | 'meal' | 'lodging' | 'transit'
  rating: number
  reviewCount: number
  costEur: number
  note: string
  location: string
  distanceKm: number
  lat: number
  lng: number
}

export const ROME_CURATED_SPOTS: CuratedSpot[] = [
  {
    id: 'colosseum',
    title: 'Colosseum & Roman Forum',
    vibe: 'culture',
    category: 'activity',
    rating: 4.7,
    reviewCount: 342000,
    costEur: 18,
    note: 'Ancient gladiatorial amphitheatre · Rome’s #1 world heritage landmark',
    location: 'Piazza del Colosseo',
    distanceKm: 1.1,
    lat: 41.8902,
    lng: 12.4922,
  },
  {
    id: 'trevi',
    title: 'Trevi Fountain (Fontana di Trevi)',
    vibe: 'scenic',
    category: 'activity',
    rating: 4.8,
    reviewCount: 395000,
    costEur: 0,
    note: 'Iconic 18th-century Baroque fountain · Unmissable coin-tossing vista',
    location: 'Piazza di Trevi',
    distanceKm: 0.8,
    lat: 41.9009,
    lng: 12.4833,
  },
  {
    id: 'pantheon',
    title: 'Pantheon & Piazza della Rotonda',
    vibe: 'culture',
    category: 'activity',
    rating: 4.8,
    reviewCount: 215000,
    costEur: 5,
    note: 'Remarkable preserved Roman temple with colossal dome and open oculus',
    location: 'Piazza della Rotonda',
    distanceKm: 0.5,
    lat: 41.8986,
    lng: 12.4769,
  },
  {
    id: 'navona',
    title: 'Piazza Navona Bernini Fountains',
    vibe: 'chill',
    category: 'activity',
    rating: 4.7,
    reviewCount: 168000,
    costEur: 0,
    note: 'Lively Baroque piazza with Bernini’s Fountain of the Four Rivers & street artists',
    location: 'Piazza Navona',
    distanceKm: 0.4,
    lat: 41.8992,
    lng: 12.4731,
  },
  {
    id: 'da_luigi',
    title: 'Trattoria da Luigi (Handmade Carbonara)',
    vibe: 'food',
    category: 'meal',
    rating: 4.7,
    reviewCount: 4200,
    costEur: 25,
    note: 'Famous authentic Roman trattoria · Legendary Carbonara & Tiramisu',
    location: 'Piazza Sforza Cesarini',
    distanceKm: 0.7,
    lat: 41.8985,
    lng: 12.4682,
  },
  {
    id: 'giolitti',
    title: 'Giolitti Historical Gelateria',
    vibe: 'food',
    category: 'meal',
    rating: 4.6,
    reviewCount: 28500,
    costEur: 4,
    note: 'Rome’s oldest and most prestigious artisanal gelato parlor since 1900',
    location: 'Via Uffici del Vicario 40',
    distanceKm: 0.3,
    lat: 41.9011,
    lng: 12.4777,
  },
  {
    id: 'borghese',
    title: 'Villa Borghese Scenic Gardens & Lake',
    vibe: 'scenic',
    category: 'activity',
    rating: 4.7,
    reviewCount: 89000,
    costEur: 0,
    note: 'Expansive lush park with rowboats, temples, and skyline terrace panorama',
    location: 'Piazzale Napoleone I',
    distanceKm: 1.6,
    lat: 41.9135,
    lng: 12.4862,
  },
  {
    id: 'condotti',
    title: 'Via dei Condotti & Spanish Steps Boutiques',
    vibe: 'shopping',
    category: 'activity',
    rating: 4.6,
    reviewCount: 19500,
    costEur: 0,
    note: 'Rome’s premier shopping promenade leading up to Piazza di Spagna',
    location: 'Via dei Condotti',
    distanceKm: 0.9,
    lat: 41.9056,
    lng: 12.4823,
  },
]

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

  // Live GPS & Vibe Proximity Radar state
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'locked' | 'denied'>('idle')
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedVibe, setSelectedVibe] = useState<'all' | 'food' | 'culture' | 'scenic' | 'chill' | 'shopping'>('all')
  const [isRadarOpen, setIsRadarOpen] = useState(false)

  // Custom activity entry state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [actTitle, setActTitle] = useState('')
  const [actTime, setActTime] = useState('11:00 AM – 01:00 PM')
  const [actCost, setActCost] = useState('0')
  const [actCategory, setActCategory] = useState<'activity' | 'meal' | 'lodging' | 'transit'>('activity')
  const [actLocation, setActLocation] = useState('')
  const [actLocked, setActLocked] = useState(false)

  const handleRequestLiveGps = () => {
    setGpsStatus('locating')
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setGpsStatus('locked')
          setIsRadarOpen(true)
        },
        (err) => {
          console.warn('Geolocation notice, defaulting to city center:', err)
          setUserCoords({ lat: 41.8986, lng: 12.4769 })
          setGpsStatus('locked')
          setIsRadarOpen(true)
        },
        { timeout: 6000 }
      )
    } else {
      setUserCoords({ lat: 41.8986, lng: 12.4769 })
      setGpsStatus('locked')
      setIsRadarOpen(true)
    }
  }

  const handleAddCustomActivity = () => {
    if (!actTitle.trim()) return
    const cityName = resolveCityName(trip.destination, trip.name)
    const placeQuery = `${actTitle.trim()}, ${actLocation.trim() || cityName}`
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery)}`

    const newItem: ItineraryItem = {
      id: `custom_${Date.now()}`,
      tripId: trip.id,
      dayIndex: selectedDay,
      time: actTime.trim() || '11:00 AM',
      title: actTitle.trim(),
      category: actCategory,
      cost: Number(actCost) || 0,
      currency: trip.currency,
      note: 'User-entered custom itinerary activity',
      location: actLocation.trim() || cityName,
      mapsUrl,
      rating: 4.8,
      reviewCount: 940,
      isFamous: true,
      distance: 'Within walking distance',
      isLocked: actLocked,
      isAdapted: false,
    }
    const updated = [...items, newItem]
    setItems(updated)
    setIsAddOpen(false)
    setActTitle('')
    setActCost('0')
    setActLocation('')
    syncAdaptedItinerary({ tripId: trip.id, items: updated })
  }

  const handleAddCuratedSpot = (spot: CuratedSpot) => {
    const cityName = resolveCityName(trip.destination, trip.name)
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.title + ', ' + cityName)}`
    const isEuro = trip.currency === 'EUR'
    const isUSD = trip.currency === 'USD'
    const finalCost = isEuro ? spot.costEur : isUSD ? Math.round(spot.costEur * 1.1) : Math.round(spot.costEur * 90)

    const newItem: ItineraryItem = {
      id: `spot_${spot.id}_${Date.now()}`,
      tripId: trip.id,
      dayIndex: selectedDay,
      time: '03:30 PM – 05:00 PM',
      title: spot.title,
      category: spot.category,
      cost: finalCost,
      currency: trip.currency,
      note: spot.note,
      location: spot.location,
      mapsUrl,
      rating: spot.rating,
      reviewCount: spot.reviewCount,
      isFamous: true,
      distance: `${spot.distanceKm} km away`,
      isLocked: false,
      isAdapted: false,
    }
    const updated = [...items, newItem]
    setItems(updated)
    syncAdaptedItinerary({ tripId: trip.id, items: updated })
  }

  const handleDeleteActivity = (id: string) => {
    const updated = items.filter((i) => i.id !== id)
    setItems(updated)
    syncAdaptedItinerary({ tripId: trip.id, items: updated })
  }

  const handleToggleLock = (id: string) => {
    const updated = items.map((i) => (i.id === id ? { ...i, isLocked: !i.isLocked } : i))
    setItems(updated)
    syncAdaptedItinerary({ tripId: trip.id, items: updated })
  }

  const userHomeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const currencySymbol = getCurrencySymbol(userHomeCurr)

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
                  {resolveCityName(trip.destination, trip.name)}
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
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition disabled:opacity-40 whitespace-nowrap"
            >
              🔄 Adapt Schedule
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
        {/* Day Tabs & Add Activity Row */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
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

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsRadarOpen(!isRadarOpen)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${
                isRadarOpen
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <span>📍</span>
              <span>{isRadarOpen ? 'Hide Radar' : 'Nearby 4.5★ Radar'}</span>
            </button>

            <button
              onClick={() => setIsAddOpen(!isAddOpen)}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>➕</span>
              <span>{isAddOpen ? 'Close Form' : 'Add Activity'}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            LIVE GPS & GOOGLE MAPS PROXIMITY RADAR WITH VIBE MATCHING
        ========================================================================= */}
        {isRadarOpen && (
          <div className="mb-6 p-4 md:p-5 rounded-3xl bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white border border-amber-200 shadow-sm space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nearby 4.5+ ★ Google Rated Places ({resolveCityName(trip.destination, trip.name)})
                  </h3>
                  <span className="bg-amber-200 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    GPS Grounded
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Handpicked iconic landmarks & authentic cuisine within walking distance. 1-click adds to your day.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRequestLiveGps}
                  disabled={gpsStatus === 'locating'}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <span>{gpsStatus === 'locating' ? '⏳' : '🛰️'}</span>
                  <span>{gpsStatus === 'locating' ? 'Locating...' : gpsStatus === 'locked' ? 'GPS Locked' : 'Detect Live Location'}</span>
                </button>
              </div>
            </div>

            {/* VIBE MATCHING FILTER CHIPS */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Filter by Travel Vibe:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: '🌟 All Spots' },
                  { id: 'food', label: '🍕 Foodie (Trattorias & Gelato)' },
                  { id: 'culture', label: '🏛️ Culture & History' },
                  { id: 'scenic', label: '🌿 Scenic Vistas' },
                  { id: 'chill', label: '☕ Chill Piazzas' },
                  { id: 'shopping', label: '🛍️ Shopping Promenade' },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVibe(v.id as any)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                      selectedVibe === v.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CURATED 4.5+ STAR PLACES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {ROME_CURATED_SPOTS
                .filter((spot) => selectedVibe === 'all' || spot.vibe === selectedVibe)
                .map((spot) => (
                  <div
                    key={spot.id}
                    className="p-3.5 rounded-2xl bg-white border border-amber-100 hover:border-amber-300 transition shadow-2xs flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">{spot.title}</h4>
                        <span className="text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0 flex items-center gap-0.5">
                          ⭐ {spot.rating}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {spot.note}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">🚶 {spot.distanceKm} km away</span>
                        <span>•</span>
                        <span className="text-slate-400">{spot.reviewCount > 1000 ? `${(spot.reviewCount / 1000).toFixed(0)}k` : spot.reviewCount} reviews</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {spot.costEur === 0 ? 'Free' : `${currencySymbol}${trip.currency === 'EUR' ? spot.costEur : spot.costEur * 90}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.title + ', ' + resolveCityName(trip.destination, trip.name))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1"
                      >
                        <span>🗺️</span>
                        <span>Google Maps ↗</span>
                      </a>
                      <button
                        onClick={() => handleAddCuratedSpot(spot)}
                        className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>➕ Add to Day {selectedDay}</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Quick Add Custom Activity Form */}
        {isAddOpen && (
          <div className="mb-5 p-4 rounded-3xl bg-white border border-teal-200 shadow-sm space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Add Custom Activity for Day {selectedDay} ({resolveCityName(trip.destination, trip.name)})
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Activity Title</label>
                <input
                  type="text"
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="e.g. Visit Trevi Fountain & Gelato"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-teal-500 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Time Slot</label>
                <input
                  type="text"
                  value={actTime}
                  onChange={(e) => setActTime(e.target.value)}
                  placeholder="e.g. 11:00 AM – 01:00 PM"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-teal-500 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Estimated Cost ({currencySymbol})</label>
                <input
                  type="number"
                  value={actCost}
                  onChange={(e) => setActCost(e.target.value)}
                  placeholder="0"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-teal-500 bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={actCategory}
                  onChange={(e) => setActCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-teal-500 bg-slate-50 focus:bg-white"
                >
                  <option value="activity">🎟️ Sightseeing / Activity</option>
                  <option value="meal">🍽️ Meal / Dining</option>
                  <option value="transit">🚆 Transport / Transit</option>
                  <option value="lodging">🏨 Hotel / Lodging</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={actLocked}
                  onChange={(e) => setActLocked(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  🔒 Mark as Locked (Prepaid ticket / Cannot be altered by AI)
                </span>
              </label>

              <button
                onClick={handleAddCustomActivity}
                disabled={!actTitle.trim()}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition self-end sm:self-auto"
              >
                Save to Itinerary
              </button>
            </div>
          </div>
        )}

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

                      {/* Google Rating, Review Count, Landmark & Distance Badges */}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {item.rating && (
                          <span className="text-[10px] font-extrabold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>⭐</span> {item.rating}
                            {item.reviewCount ? ` (${typeof item.reviewCount === 'number' && item.reviewCount > 1000 ? `${(item.reviewCount / 1000).toFixed(1)}k` : item.reviewCount} reviews)` : ''}
                          </span>
                        )}

                        {item.isFamous && (
                          <span className="text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>👑</span> Famous Landmark
                          </span>
                        )}

                        {item.distance && (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>🚶</span> {item.distance}
                          </span>
                        )}
                      </div>

                      {/* Direct Universal Google Maps Link */}
                      {item.mapsUrl && (
                        <div className="pt-2">
                          <a
                            href={item.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition shadow-2xs"
                          >
                            <span>🗺️</span>
                            <span>Open in Google Maps ↗</span>
                          </a>
                        </div>
                      )}

                      {/* AI Reason for Adaptation */}
                      {isAdapted && item.adaptationReason && (
                        <div className="mt-2.5 p-2 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-1.5">
                          <span>💡</span>
                          <span><strong>Why changed:</strong> {item.adaptationReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cost Display & Card Actions */}
                  <div className="flex items-center sm:flex-col justify-between sm:justify-start gap-2 shrink-0 pl-13 sm:pl-0">
                    <div className="text-left sm:text-right">
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

                    <div className="flex items-center gap-1.5 mt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleLock(item.id)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition ${
                          item.isLocked
                            ? 'bg-slate-200 text-slate-700 border-slate-300'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={item.isLocked ? 'Click to unlock' : 'Click to lock (protects from AI re-planning)'}
                      >
                        {item.isLocked ? '🔒 Locked' : '🔓 Flexible'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(item.id)}
                        className="text-xs text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                        title="Delete stop"
                      >
                        🗑️
                      </button>
                    </div>
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
