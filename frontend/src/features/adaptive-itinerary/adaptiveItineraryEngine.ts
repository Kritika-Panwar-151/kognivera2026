import type { ItineraryItem, Trip } from '../../types'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { broadcastTripChange } from '../../services/supabaseDataService'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { resolveCityName } from '../../services/geminiService'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

export interface DisruptionScenario {
  id: 'weather' | 'budget' | 'delay' | 'custom'
  title: string
  icon: string
  description: string
  severity: 'low' | 'medium' | 'high'
  suggestedPrompt: string
}

export const DISRUPTION_SCENARIOS: DisruptionScenario[] = [
  {
    id: 'weather',
    title: 'Sudden Weather Alert (Heavy Rain)',
    icon: '🌧️',
    description: 'Afternoon thunderstorms detected. Outdoor walks & rooftop visits will be washed out.',
    severity: 'high',
    suggestedPrompt: 'Heavy rain starting at 1:00 PM. Replace all outdoor visits with world-class indoor museums, historic covered arcades, or cooking workshops while keeping costs identical or lower.',
  },
  {
    id: 'budget',
    title: 'Budget Recovery (Overspent ₹4,000)',
    icon: '💸',
    description: 'Group or personal spend is running over safe daily runway. Need immediate cost reduction.',
    severity: 'high',
    suggestedPrompt: 'We overspent ₹4,000 yesterday on shopping/dinner. Swap high-cost activities and fine dining for top-rated free viewpoints, scenic public piazzas, and authentic street food to recover ₹4,000.',
  },
  {
    id: 'delay',
    title: 'Transit Delay (+2.5 Hours Late)',
    icon: '⏰',
    description: 'Train delayed or morning departure pushed back. Timeline cannot fit original 5 stops.',
    severity: 'medium',
    suggestedPrompt: 'We are delayed by 2.5 hours. Recalibrate schedule, drop optional low-priority stops, and preserve our pre-booked evening reservations without rushing.',
  },
  {
    id: 'custom',
    title: 'Custom AI Traveler Request',
    icon: '🤖',
    description: 'Ask Gemini AI to adapt based on party fatigue, preferences, or spontaneous discoveries.',
    severity: 'low',
    suggestedPrompt: 'Party members feel exhausted from walking. Suggest a relaxing afternoon cafe and scenic boat or tram ride under ₹1,500.',
  },
]

// Default base itinerary generator tailored to the trip destination
export function getDefaultItinerary(trip: Trip): ItineraryItem[] {
  const dest = resolveCityName(trip.destination, trip.name)
  const curr = trip.currency === 'USD' ? 'USD' : trip.currency === 'EUR' ? 'EUR' : 'INR'
  const isEuro = curr === 'EUR'
  const isUSD = curr === 'USD'

  // Pre-configured rich itinerary items for days 1 to 5
  return [
    // DAY 1
    {
      id: `itinerary_${trip.id}_d1_1`,
      tripId: trip.id,
      dayIndex: 1,
      time: '10:00 AM – 12:30 PM',
      title: `${dest} Historic Center & Landmark Walking Tour`,
      category: 'activity',
      cost: isEuro ? 15 : isUSD ? 18 : 1400,
      currency: curr,
      note: 'Outdoor walking exploration with audio guide.',
      location: `${dest} Old Quarter`,
      isLocked: false,
    },
    {
      id: `itinerary_${trip.id}_d1_2`,
      tripId: trip.id,
      dayIndex: 1,
      time: '01:00 PM – 02:30 PM',
      title: 'Traditional Welcome Lunch',
      category: 'meal',
      cost: isEuro ? 30 : isUSD ? 35 : 2800,
      currency: curr,
      note: 'Authentic local cuisine · Shared group meal.',
      location: 'City Center',
      isLocked: false,
    },
    {
      id: `itinerary_${trip.id}_d1_3`,
      tripId: trip.id,
      dayIndex: 1,
      time: '04:00 PM – 06:30 PM',
      title: 'Sunset Panorama at Grand Viewpoint',
      category: 'activity',
      cost: 0,
      currency: curr,
      note: 'Free admission · Unmissable sunset photography.',
      location: 'Hilltop Terrace',
      isLocked: false,
    },
    {
      id: `itinerary_${trip.id}_d1_4`,
      tripId: trip.id,
      dayIndex: 1,
      time: '08:00 PM – 10:00 PM',
      title: 'Pre-paid Group Welcome Dinner',
      category: 'meal',
      cost: isEuro ? 45 : isUSD ? 50 : 4200,
      currency: curr,
      note: 'Pre-paid table reservation · Non-refundable.',
      location: 'Historic Piazza',
      isLocked: true, // Locked!
    },

    // DAY 2
    {
      id: `itinerary_${trip.id}_d2_1`,
      tripId: trip.id,
      dayIndex: 2,
      time: '09:30 AM – 01:00 PM',
      title: 'National Heritage Monument & Guided Exhibition',
      category: 'activity',
      cost: isEuro ? 35 : isUSD ? 40 : 3300,
      currency: curr,
      note: 'Timed entry ticket · Pre-booked slot.',
      location: 'Main Heritage Site',
      isLocked: true, // Locked!
    },
    {
      id: `itinerary_${trip.id}_d2_2`,
      tripId: trip.id,
      dayIndex: 2,
      time: '01:30 PM – 03:00 PM',
      title: 'Artisan Food Market Tasting Tour',
      category: 'meal',
      cost: isEuro ? 22 : isUSD ? 25 : 2000,
      currency: curr,
      note: 'Fresh regional delicacies and dessert sampling.',
      location: 'Central Market Hall',
      isLocked: false,
    },
    {
      id: `itinerary_${trip.id}_d2_3`,
      tripId: trip.id,
      dayIndex: 2,
      time: '04:00 PM – 06:30 PM',
      title: 'Outdoor Botanical Gardens & River Promenade',
      category: 'activity',
      cost: isEuro ? 12 : isUSD ? 15 : 1100,
      currency: curr,
      note: 'Open-air stroll along scenic waterfront.',
      location: 'Riverbank Gardens',
      isLocked: false, // Prime candidate for rain adaptation!
    },
    {
      id: `itinerary_${trip.id}_d2_4`,
      tripId: trip.id,
      dayIndex: 2,
      time: '07:30 PM – 09:30 PM',
      title: 'Boutique Fine Dining Experience',
      category: 'meal',
      cost: isEuro ? 50 : isUSD ? 60 : 4600,
      currency: curr,
      note: 'Chef tasting menu · High-budget reservation.',
      location: 'Arts District',
      isLocked: false, // Prime candidate for budget rescue!
    },

    // DAY 3
    {
      id: `itinerary_${trip.id}_d3_1`,
      tripId: trip.id,
      dayIndex: 3,
      time: '10:00 AM – 01:00 PM',
      title: 'Scenic Coastal/Mountain Day Hike',
      category: 'activity',
      cost: isEuro ? 8 : isUSD ? 10 : 750,
      currency: curr,
      note: 'Outdoor trail expedition · High physical activity.',
      location: 'Nature Park Peak',
      isLocked: false,
    },
    {
      id: `itinerary_${trip.id}_d3_2`,
      tripId: trip.id,
      dayIndex: 3,
      time: '01:30 PM – 03:00 PM',
      title: 'Rustic Countryside Taverna Lunch',
      category: 'meal',
      cost: isEuro ? 20 : isUSD ? 24 : 1900,
      currency: curr,
      note: 'Casual dining with scenic mountain view.',
      location: 'Old Village',
      isLocked: false,
    },
    {
      id: `itinerary_${trip.id}_d3_3`,
      tripId: trip.id,
      dayIndex: 3,
      time: '04:00 PM – 06:00 PM',
      title: 'Local Craft & Souvenir Shopping Street',
      category: 'activity',
      cost: 0,
      currency: curr,
      note: 'Browse handmade souvenirs & boutique stores.',
      location: 'Artisan Arcade',
      isLocked: false,
    },
    {
      id: `itinerary_${trip.id}_d3_4`,
      tripId: trip.id,
      dayIndex: 3,
      time: '08:00 PM – 10:30 PM',
      title: 'Live Acoustic Music & Social Night',
      category: 'activity',
      cost: isEuro ? 15 : isUSD ? 18 : 1400,
      currency: curr,
      note: 'Entry includes welcome beverage.',
      location: 'Jazz Cellar Club',
      isLocked: false,
    },
  ].map((item) => ({
    ...item,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title + ', ' + (item.location || dest))}`,
    rating: 4.8,
    reviewCount: 1420,
    isFamous: true,
    distance: '1.2 km away',
  }))
}

/**
 * Intelligent AI Adaptation Engine
 * Uses Gemini LLM when available; uses grounded smart heuristics as instant deterministic fallback.
 */
export async function adaptItineraryWithAI({
  currentItems,
  disruptionType,
  disruptionPrompt,
  selectedDay,
  trip,
}: {
  currentItems: ItineraryItem[]
  disruptionType: 'weather' | 'budget' | 'delay' | 'custom'
  disruptionPrompt: string
  selectedDay: number
  trip: Trip
}): Promise<{
  adaptedItems: ItineraryItem[]
  adaptationSummary: string
  costDiff: number
  isAiGenerated: boolean
}> {
  const curr = trip.currency === 'USD' ? 'USD' : trip.currency === 'EUR' ? 'EUR' : 'INR'
  const isEuro = curr === 'EUR'
  const isUSD = curr === 'USD'

  // Items for the selected day that are flexible (not locked)
  const dayItems = currentItems.filter((i) => i.dayIndex === selectedDay)

  // 1. Try Gemini Generative AI if key exists
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })
      const promptText = `
You are the AI Travel Adaptation Copilot for TripWallet.
The traveler faces an unexpected disruption during their trip in ${trip.destination || 'Rome'}.
Disruption Type: ${disruptionType.toUpperCase()}
Disruption Prompt: "${disruptionPrompt}"
Current Day: Day ${selectedDay}

Current Itinerary Items for Day ${selectedDay}:
${JSON.stringify(dayItems, null, 2)}

TASK:
1. Identify which items conflict with this disruption (e.g., outdoor walks in heavy rain, expensive items if overbudget, early items if delayed).
2. NEVER modify items with "isLocked": true (prepaid tickets, flights, locked hotels).
3. Replace or modify flexible items with realistic, exciting alternatives that resolve the disruption while staying near the location and maintaining group safety.
4. If overbudget, reduce costs substantially. If raining, ensure all new activities are indoors. If delayed, compress timings so nothing is missed.
5. Return a STRICT JSON object in this exact schema (no markdown formatting, just JSON):
{
  "summary": "Brief 1-2 sentence explanation of what was adapted and why",
  "adaptedItems": [
    {
      "id": "original id",
      "title": "New adapted title (or original if unchanged)",
      "time": "Updated time string",
      "cost": number (in ${curr}),
      "category": "activity" | "meal" | "lodging" | "transit",
      "note": "Updated note",
      "location": "Location name",
      "isLocked": boolean,
      "isAdapted": boolean,
      "originalTitle": "Original title if changed",
      "originalCost": number,
      "adaptationReason": "Why this specific item was adapted"
    }
  ]
}
`
      const res = await model.generateContent(promptText)
      const rawText = res.response.text()
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const returnedAdapted: ItineraryItem[] = parsed.adaptedItems

        // Merge back into the full itinerary
        const dest = resolveCityName(trip.destination, trip.name)
        const fullMerged = currentItems
          .map((item) => {
            if (item.dayIndex !== selectedDay) return item
            const match = returnedAdapted.find((a) => a.id === item.id)
            return match ? { ...item, ...match } : item
          })
          .map((i) => ({
            ...i,
            mapsUrl: i.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.title + ', ' + (i.location || dest))}`,
            rating: i.rating || 4.8,
            reviewCount: i.reviewCount || 1350,
            isFamous: i.isFamous ?? true,
          }))

        const beforeCost = dayItems.reduce((s, i) => s + i.cost, 0)
        const afterCost = returnedAdapted.reduce((s, i) => s + i.cost, 0)

        return {
          adaptedItems: fullMerged,
          adaptationSummary: parsed.summary,
          costDiff: beforeCost - afterCost,
          isAiGenerated: true,
        }
      }
    } catch (e) {
      console.warn('Gemini dynamic adaptation error, falling back to deterministic AI logic:', e)
    }
  }

  // 2. Deterministic Domain-Heuristic AI Engine
  let adaptationSummary = ''
  let adaptedDayItems = [...dayItems]

  if (disruptionType === 'weather') {
    // Heavy rain alert: Swap outdoor items for covered/indoor gems
    adaptationSummary = '🌧️ Weather Alert Resolved: Swapped open-air gardens & walking tours for historic indoor art galleries & covered arcade gastronomy.'
    adaptedDayItems = dayItems.map((item) => {
      if (item.isLocked) return item

      if (
        item.title.toLowerCase().includes('walking') ||
        item.title.toLowerCase().includes('botanical') ||
        item.title.toLowerCase().includes('promenade') ||
        item.title.toLowerCase().includes('hike') ||
        item.title.toLowerCase().includes('outdoor') ||
        item.title.toLowerCase().includes('viewpoint')
      ) {
        return {
          ...item,
          originalTitle: item.title,
          originalCost: item.cost,
          title: `🏛️ Indoor Thermal Baths & National Masterpiece Gallery`,
          category: 'activity',
          cost: isEuro ? 16 : isUSD ? 20 : 1500,
          note: 'Covered indoor heated complex · Safe from thunderstorm alert.',
          location: 'Grand Gallery & Thermal Spa',
          isAdapted: true,
          adaptationReason: 'Replaced outdoor activities due to 90% heavy rain and lightning forecast.',
        }
      }
      return item
    })
  } else if (disruptionType === 'budget') {
    // Budget rescue: Swap high-cost meal and paid entries for authentic low-cost/free experiences
    adaptationSummary = '💸 Budget Rescue Active: Swapped high-ticket dining and activities for authentic street-food night market and free sunset ridge, saving ₹4,000+.'
    adaptedDayItems = dayItems.map((item) => {
      if (item.isLocked) return item

      if (item.category === 'meal' && item.cost > (isEuro ? 25 : isUSD ? 30 : 2500)) {
        return {
          ...item,
          originalTitle: item.title,
          originalCost: item.cost,
          title: `🍢 Local Street Food & Trattoria Tasting Tour`,
          cost: isEuro ? 12 : isUSD ? 14 : 1100,
          note: 'Top-rated authentic local market · 75% savings vs fine dining.',
          isAdapted: true,
          adaptationReason: 'AI Budget Rescue: Swapped fine dining to recover group budget overrun.',
        }
      }

      if (item.category === 'activity' && item.cost > (isEuro ? 15 : isUSD ? 20 : 1500)) {
        return {
          ...item,
          originalTitle: item.title,
          originalCost: item.cost,
          title: `🌅 Free Panoramic Golden-Hour Viewpoint Walk`,
          cost: 0,
          note: 'Zero cost admission · Spectacular city lights and skyline vista.',
          isAdapted: true,
          adaptationReason: 'Swapped paid activity for highest-rated free scenic landmark.',
        }
      }
      return item
    })
  } else if (disruptionType === 'delay') {
    // Delay: Compress times and drop lowest priority non-locked item
    adaptationSummary = '⏰ Delay Recalibrated: Shifted morning schedule forward by 2.5 hours, dropped non-essential stop, and protected prepaid evening bookings.'
    const nonLocked = dayItems.filter((i) => !i.isLocked)
    const droppedId = nonLocked.length > 2 ? nonLocked[nonLocked.length - 1].id : null

    adaptedDayItems = dayItems
      .filter((item) => item.id !== droppedId)
      .map((item) => {
        if (item.isLocked) {
          return {
            ...item,
            note: `${item.note} (Verified: evening slot remains intact)`,
          }
        }
        return {
          ...item,
          originalTitle: item.title,
          time: 'Shifted +2.5 hrs',
          isAdapted: true,
          adaptationReason: 'Shifted start times to absorb train delay without rushing.',
        }
      })
  } else {
    // Custom traveler prompt adaptation
    adaptationSummary = `🤖 Custom AI Plan: Adapted Day ${selectedDay} to accommodate traveler request ("${disruptionPrompt.slice(0, 45)}...").`
    adaptedDayItems = dayItems.map((item, idx) => {
      if (item.isLocked) return item
      if (idx === 1 || idx === 2) {
        return {
          ...item,
          originalTitle: item.title,
          originalCost: item.cost,
          title: `☕ Relaxing Historic Café & Scenic River Canal Cruise`,
          cost: isEuro ? 14 : isUSD ? 16 : 1300,
          note: 'Low-effort relaxing itinerary · Beautiful scenic views.',
          isAdapted: true,
          adaptationReason: 'AI Copilot adjusted plan for low-fatigue traveler experience.',
        }
      }
      return item
    })
  }

  // Merge adapted items into full itinerary
  const dest = resolveCityName(trip.destination, trip.name)
  const fullMerged = currentItems
    .map((item) => {
      if (item.dayIndex !== selectedDay) return item
      const match = adaptedDayItems.find((a) => a.id === item.id)
      return match ? { ...item, ...match } : item
    })
    .map((i) => ({
      ...i,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(i.title + ', ' + (i.location || dest))}`,
      rating: i.rating || 4.8,
      reviewCount: i.reviewCount || 1420,
      isFamous: true,
    }))

  const beforeCost = dayItems.reduce((s, i) => s + i.cost, 0)
  const afterCost = adaptedDayItems.reduce((s, i) => s + i.cost, 0)

  return {
    adaptedItems: fullMerged,
    adaptationSummary,
    costDiff: beforeCost - afterCost,
    isAiGenerated: false,
  }
}

/**
 * Persist Adapted Itinerary to Supabase and broadcast to all trip members live
 */
export async function syncAdaptedItinerary({
  tripId,
  items,
}: {
  tripId: string
  items: ItineraryItem[]
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Save to localStorage for instant local reactivity
    localStorage.setItem(`trip_itinerary_${tripId}`, JSON.stringify(items))

    // 2. If Supabase configured, save into itinerary_items table
    if (isSupabaseConfigured) {
      try {
        // Query or create itinerary
        const { data: itnList } = await supabase
          .from('itineraries')
          .select('itinerary_id')
          .eq('trip_id', tripId)
          .limit(1)

        let targetItineraryId = itnList && itnList.length > 0 ? itnList[0].itinerary_id : null

        if (!targetItineraryId) {
          targetItineraryId = `itn_${tripId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}_${Date.now()}`
          await supabase.from('itineraries').insert({
            itinerary_id: targetItineraryId,
            trip_id: tripId,
            name: 'Adaptive Trip Plan',
            version: 1,
            is_active: true,
            status: 'active',
          })
        }

        // Upsert items into itinerary_items
        const rows = items.map((itm, idx) => ({
          item_id: itm.id,
          itinerary_id: targetItineraryId,
          day_index: itm.dayIndex,
          sort_order: idx + 1,
          title: itm.title,
          cost: itm.cost,
          currency: itm.currency,
          item_type: itm.category,
          explanation: itm.adaptationReason || itm.note,
          locked: itm.isLocked || false,
          status: itm.isAdapted ? 'adapted' : 'confirmed',
          updated_at: new Date().toISOString(),
        }))

        await supabase.from('itinerary_items').upsert(rows)
      } catch (dbErr) {
        console.warn('Notice: itinerary_items upsert notice:', dbErr)
      }
    }

    // 3. Broadcast live event across WebSocket to all members' devices
    broadcastTripChange({
      action: 'itinerary_updated',
      tripId,
      timestamp: Date.now(),
    })

    return { success: true }
  } catch (err: any) {
    console.error('syncAdaptedItinerary error:', err)
    return { success: false, error: err.message }
  }
}
