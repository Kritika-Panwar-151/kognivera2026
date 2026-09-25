// Canonical reference data matching PS-08 DATA_MODEL.md (Countries, Currencies, Cities, Enums)

export interface CountryRef {
  id: string
  name: string
  iso2: string
  iso3: string
  defaultCurrency: string
  currencySymbol: string
  locale: string
  callingCode: string
}

export interface CityRef {
  id: string
  name: string
  countryId: string
  countryCode: string
  timezone: string
  lat?: number
  lng?: number
}

export const CANONICAL_COUNTRIES: CountryRef[] = [
  { id: 'cnt_in', name: 'India', iso2: 'IN', iso3: 'IND', defaultCurrency: 'INR', currencySymbol: '₹', locale: 'en-IN', callingCode: '+91' },
  { id: 'cnt_us', name: 'United States', iso2: 'US', iso3: 'USA', defaultCurrency: 'USD', currencySymbol: '$', locale: 'en-US', callingCode: '+1' },
  { id: 'cnt_fr', name: 'France', iso2: 'FR', iso3: 'FRA', defaultCurrency: 'EUR', currencySymbol: '€', locale: 'fr-FR', callingCode: '+33' },
  { id: 'cnt_it', name: 'Italy', iso2: 'IT', iso3: 'ITA', defaultCurrency: 'EUR', currencySymbol: '€', locale: 'it-IT', callingCode: '+39' },
  { id: 'cnt_gb', name: 'United Kingdom', iso2: 'GB', iso3: 'GBR', defaultCurrency: 'GBP', currencySymbol: '£', locale: 'en-GB', callingCode: '+44' },
  { id: 'cnt_jp', name: 'Japan', iso2: 'JP', iso3: 'JPN', defaultCurrency: 'JPY', currencySymbol: '¥', locale: 'ja-JP', callingCode: '+81' },
  { id: 'cnt_ch', name: 'Switzerland', iso2: 'CH', iso3: 'CHE', defaultCurrency: 'CHF', currencySymbol: 'CHF', locale: 'de-CH', callingCode: '+41' },
  { id: 'cnt_ae', name: 'United Arab Emirates', iso2: 'AE', iso3: 'ARE', defaultCurrency: 'AED', currencySymbol: 'AED', locale: 'ar-AE', callingCode: '+971' },
  { id: 'cnt_sg', name: 'Singapore', iso2: 'SG', iso3: 'SGP', defaultCurrency: 'SGD', currencySymbol: 'S$', locale: 'en-SG', callingCode: '+65' },
  { id: 'cnt_th', name: 'Thailand', iso2: 'TH', iso3: 'THA', defaultCurrency: 'THB', currencySymbol: '฿', locale: 'th-TH', callingCode: '+66' },
  { id: 'cnt_au', name: 'Australia', iso2: 'AU', iso3: 'AUS', defaultCurrency: 'AUD', currencySymbol: 'A$', locale: 'en-AU', callingCode: '+61' },
  { id: 'cnt_de', name: 'Germany', iso2: 'DE', iso3: 'DEU', defaultCurrency: 'EUR', currencySymbol: '€', locale: 'de-DE', callingCode: '+49' },
  { id: 'cnt_es', name: 'Spain', iso2: 'ES', iso3: 'ESP', defaultCurrency: 'EUR', currencySymbol: '€', locale: 'es-ES', callingCode: '+34' },
  { id: 'cnt_ca', name: 'Canada', iso2: 'CA', iso3: 'CAN', defaultCurrency: 'CAD', currencySymbol: 'CA$', locale: 'en-CA', callingCode: '+1' },
]

export const CANONICAL_CITIES: CityRef[] = [
  // India
  { id: 'cty_bangalore', name: 'Bengaluru', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 12.9716, lng: 77.5946 },
  { id: 'cty_chennai', name: 'Chennai', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 13.0827, lng: 80.2707 },
  { id: 'cty_mumbai', name: 'Mumbai', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 19.0760, lng: 72.8777 },
  { id: 'cty_delhi', name: 'New Delhi', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 28.6139, lng: 77.2090 },
  { id: 'cty_goa', name: 'Goa', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 15.2993, lng: 74.1240 },
  { id: 'cty_hyderabad', name: 'Hyderabad', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 17.3850, lng: 78.4867 },
  { id: 'cty_kolkata', name: 'Kolkata', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 22.5726, lng: 88.3639 },
  { id: 'cty_jaipur', name: 'Jaipur', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 26.9124, lng: 75.7873 },
  { id: 'cty_pune', name: 'Pune', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 18.5204, lng: 73.8567 },
  { id: 'cty_kochi', name: 'Kochi', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 9.9312, lng: 76.2673 },
  { id: 'cty_ahmedabad', name: 'Ahmedabad', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata', lat: 23.0225, lng: 72.5714 },
  
  // France
  { id: 'cty_paris', name: 'Paris', countryId: 'cnt_fr', countryCode: 'FR', timezone: 'Europe/Paris', lat: 48.8566, lng: 2.3522 },
  { id: 'cty_nice', name: 'Nice', countryId: 'cnt_fr', countryCode: 'FR', timezone: 'Europe/Paris', lat: 43.7102, lng: 7.2620 },
  { id: 'cty_lyon', name: 'Lyon', countryId: 'cnt_fr', countryCode: 'FR', timezone: 'Europe/Paris', lat: 45.7640, lng: 4.8357 },

  // Italy
  { id: 'cty_rome', name: 'Rome', countryId: 'cnt_it', countryCode: 'IT', timezone: 'Europe/Rome', lat: 41.9028, lng: 12.4964 },
  { id: 'cty_milan', name: 'Milan', countryId: 'cnt_it', countryCode: 'IT', timezone: 'Europe/Rome', lat: 45.4642, lng: 9.1900 },
  { id: 'cty_venice', name: 'Venice', countryId: 'cnt_it', countryCode: 'IT', timezone: 'Europe/Rome', lat: 45.4408, lng: 12.3155 },
  { id: 'cty_florence', name: 'Florence', countryId: 'cnt_it', countryCode: 'IT', timezone: 'Europe/Rome', lat: 43.7696, lng: 11.2558 },

  // United Kingdom
  { id: 'cty_london', name: 'London', countryId: 'cnt_gb', countryCode: 'GB', timezone: 'Europe/London', lat: 51.5074, lng: -0.1278 },
  { id: 'cty_manchester', name: 'Manchester', countryId: 'cnt_gb', countryCode: 'GB', timezone: 'Europe/London', lat: 53.4808, lng: -2.2426 },
  { id: 'cty_edinburgh', name: 'Edinburgh', countryId: 'cnt_gb', countryCode: 'GB', timezone: 'Europe/London', lat: 55.9533, lng: -3.1883 },

  // Switzerland
  { id: 'cty_zurich', name: 'Zurich', countryId: 'cnt_ch', countryCode: 'CH', timezone: 'Europe/Zurich', lat: 47.3769, lng: 8.5417 },
  { id: 'cty_geneva', name: 'Geneva', countryId: 'cnt_ch', countryCode: 'CH', timezone: 'Europe/Zurich', lat: 46.2044, lng: 6.1432 },
  { id: 'cty_lucerne', name: 'Lucerne', countryId: 'cnt_ch', countryCode: 'CH', timezone: 'Europe/Zurich', lat: 47.0502, lng: 8.3093 },
  { id: 'cty_interlaken', name: 'Interlaken', countryId: 'cnt_ch', countryCode: 'CH', timezone: 'Europe/Zurich', lat: 46.6863, lng: 7.8632 },

  // Japan
  { id: 'cty_tokyo', name: 'Tokyo', countryId: 'cnt_jp', countryCode: 'JP', timezone: 'Asia/Tokyo', lat: 35.6762, lng: 139.6503 },
  { id: 'cty_kyoto', name: 'Kyoto', countryId: 'cnt_jp', countryCode: 'JP', timezone: 'Asia/Tokyo', lat: 35.0116, lng: 135.7681 },
  { id: 'cty_osaka', name: 'Osaka', countryId: 'cnt_jp', countryCode: 'JP', timezone: 'Asia/Tokyo', lat: 34.6937, lng: 135.5023 },

  // United Arab Emirates
  { id: 'cty_dubai', name: 'Dubai', countryId: 'cnt_ae', countryCode: 'AE', timezone: 'Asia/Dubai', lat: 25.2048, lng: 55.2708 },
  { id: 'cty_abudhabi', name: 'Abu Dhabi', countryId: 'cnt_ae', countryCode: 'AE', timezone: 'Asia/Dubai', lat: 24.4539, lng: 54.3773 },

  // Singapore
  { id: 'cty_singapore', name: 'Singapore', countryId: 'cnt_sg', countryCode: 'SG', timezone: 'Asia/Singapore', lat: 1.3521, lng: 103.8198 },

  // Thailand
  { id: 'cty_bangkok', name: 'Bangkok', countryId: 'cnt_th', countryCode: 'TH', timezone: 'Asia/Bangkok', lat: 13.7563, lng: 100.5018 },
  { id: 'cty_phuket', name: 'Phuket', countryId: 'cnt_th', countryCode: 'TH', timezone: 'Asia/Bangkok', lat: 7.8804, lng: 98.3923 },
  { id: 'cty_chiangmai', name: 'Chiang Mai', countryId: 'cnt_th', countryCode: 'TH', timezone: 'Asia/Bangkok', lat: 18.7883, lng: 98.9853 },

  // United States
  { id: 'cty_newyork', name: 'New York', countryId: 'cnt_us', countryCode: 'US', timezone: 'America/New_York', lat: 40.7128, lng: -74.0060 },
  { id: 'cty_losangeles', name: 'Los Angeles', countryId: 'cnt_us', countryCode: 'US', timezone: 'America/Los_Angeles', lat: 34.0522, lng: -118.2437 },
  { id: 'cty_sanfrancisco', name: 'San Francisco', countryId: 'cnt_us', countryCode: 'US', timezone: 'America/Los_Angeles', lat: 37.7749, lng: -122.4194 },
  { id: 'cty_chicago', name: 'Chicago', countryId: 'cnt_us', countryCode: 'US', timezone: 'America/Chicago', lat: 41.8781, lng: -87.6298 },
  { id: 'cty_miami', name: 'Miami', countryId: 'cnt_us', countryCode: 'US', timezone: 'America/New_York', lat: 25.7617, lng: -80.1918 },

  // Australia
  { id: 'cty_sydney', name: 'Sydney', countryId: 'cnt_au', countryCode: 'AU', timezone: 'Australia/Sydney', lat: -33.8688, lng: 151.2093 },
  { id: 'cty_melbourne', name: 'Melbourne', countryId: 'cnt_au', countryCode: 'AU', timezone: 'Australia/Melbourne', lat: -37.8136, lng: 144.9631 },

  // Germany
  { id: 'cty_berlin', name: 'Berlin', countryId: 'cnt_de', countryCode: 'DE', timezone: 'Europe/Berlin', lat: 52.5200, lng: 13.4050 },
  { id: 'cty_munich', name: 'Munich', countryId: 'cnt_de', countryCode: 'DE', timezone: 'Europe/Berlin', lat: 48.1351, lng: 11.5820 },
  { id: 'cty_frankfurt', name: 'Frankfurt', countryId: 'cnt_de', countryCode: 'DE', timezone: 'Europe/Berlin', lat: 50.1109, lng: 8.6821 },

  // Spain
  { id: 'cty_madrid', name: 'Madrid', countryId: 'cnt_es', countryCode: 'ES', timezone: 'Europe/Madrid', lat: 40.4168, lng: -3.7038 },
  { id: 'cty_barcelona', name: 'Barcelona', countryId: 'cnt_es', countryCode: 'ES', timezone: 'Europe/Madrid', lat: 41.3851, lng: 2.1734 },

  // Canada
  { id: 'cty_toronto', name: 'Toronto', countryId: 'cnt_ca', countryCode: 'CA', timezone: 'America/Toronto', lat: 43.6532, lng: -79.3832 },
  { id: 'cty_vancouver', name: 'Vancouver', countryId: 'cnt_ca', countryCode: 'CA', timezone: 'America/Vancouver', lat: 49.2827, lng: -123.1207 },
]

export const BUDGET_BANDS = [
  { value: 'shoestring', label: 'Shoestring (Backpacking)' },
  { value: 'value', label: 'Value (Budget Conscious)' },
  { value: 'mid', label: 'Mid-Range (Balanced)' },
  { value: 'premium', label: 'Premium (High Comfort)' },
  { value: 'luxury', label: 'Luxury (Exclusive)' },
] as const

export const TRAVEL_STYLES = [
  { value: 'budget', label: 'Budget Saver 🏷️' },
  { value: 'comfort', label: 'Comfort First 🛋️' },
  { value: 'luxury', label: 'Luxury & Indulgence 💎' },
  { value: 'adventure', label: 'Outdoor Adventure 🧗' },
  { value: 'slow', label: 'Slow Travel & Living ☕' },
  { value: 'cultural', label: 'Culture & Heritage 🏛️' },
  { value: 'wellness', label: 'Wellness & Relaxation 🧘' },
] as const

export const TRAVELLER_TYPES = [
  { value: 'solo', label: 'Solo Traveler 🎒' },
  { value: 'couple', label: 'Couple 👫' },
  { value: 'family', label: 'Family with Kids 👨‍👩‍👧' },
  { value: 'friends', label: 'Group of Friends 🍻' },
  { value: 'business', label: 'Business / Digital Nomad 💻' },
  { value: 'backpacker', label: 'Backpacker 🥾' },
] as const

export function getCurrencyForCountry(countryNameOrCode: string): string {
  const c = CANONICAL_COUNTRIES.find(
    (item) =>
      item.name.toLowerCase() === countryNameOrCode.toLowerCase() ||
      item.iso2.toLowerCase() === countryNameOrCode.toLowerCase() ||
      item.iso3.toLowerCase() === countryNameOrCode.toLowerCase()
  )
  return c ? c.defaultCurrency : 'INR'
}

export function getCountryByName(name: string): CountryRef | undefined {
  return CANONICAL_COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase())
}

/**
 * Returns canonical cities belonging to the specified country name or ID.
 */
export function getCitiesForCountry(countryNameOrId: string): CityRef[] {
  if (!countryNameOrId) return []
  const country = CANONICAL_COUNTRIES.find(
    (c) =>
      c.name.toLowerCase() === countryNameOrId.toLowerCase() ||
      c.id.toLowerCase() === countryNameOrId.toLowerCase() ||
      c.iso2.toLowerCase() === countryNameOrId.toLowerCase()
  )
  if (!country) return []
  return CANONICAL_CITIES.filter((city) => city.countryId === country.id)
}

/**
 * Haversine formula to compute distance in kilometers between two geographic coordinates.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Find city coordinates by name (fuzzy matching case and alternate names like Bangalore -> Bengaluru).
 */
export function findCityByName(cityName: string): CityRef | undefined {
  if (!cityName) return undefined
  const q = cityName.toLowerCase().trim()
  return CANONICAL_CITIES.find(
    (c) =>
      c.name.toLowerCase() === q ||
      (q.includes('bangalore') && c.name.toLowerCase().includes('bengaluru')) ||
      (q.includes('bengaluru') && c.name.toLowerCase().includes('bengaluru')) ||
      (q.includes('delhi') && c.name.toLowerCase().includes('delhi'))
  )
}

/**
 * Calculates estimated travel distance in km between two cities.
 */
export function estimateTravelDistanceKm(
  originCity: string,
  originCountry: string,
  destCity: string,
  destCountry: string
): number {
  const c1 = findCityByName(originCity)
  const c2 = findCityByName(destCity)

  if (c1?.lat && c1?.lng && c2?.lat && c2?.lng) {
    const dist = calculateDistanceKm(c1.lat, c1.lng, c2.lat, c2.lng)
    if (dist > 0) return dist
  }

  // Fallback estimates if exact lat/lng isn't found
  const isDomestic = (originCountry || '').toLowerCase() === (destCountry || '').toLowerCase()
  if (isDomestic) {
    if (originCity.toLowerCase().trim() === destCity.toLowerCase().trim()) return 30
    return 450 // Default domestic intercity distance (e.g. 450 km)
  }
  return 5500 // Default international flight distance
}

export interface MinBudgetResult {
  minAmountINR: number
  distanceKm: number
  isDomestic: boolean
  transportCostINR: number
  livingCostINR: number
  days: number
  totalParty: number
  reasoning: string
}

/**
 * Calculates distance-based minimum realistic budget (in INR base).
 */
export function calculateMinimumTripBudgetParams(params: {
  originCity: string
  originCountry: string
  destinationCity: string
  destinationCountry: string
  startDate: string
  endDate: string
  adults?: number
  children?: number
}): MinBudgetResult {
  const { originCity, originCountry, destinationCity, destinationCountry, startDate, endDate, adults = 1, children = 0 } = params

  const distKm = estimateTravelDistanceKm(originCity, originCountry, destinationCity, destinationCountry)
  const isDomestic = (originCountry || '').toLowerCase() === (destinationCountry || '').toLowerCase()

  // Calculate trip duration in days
  let days = 1
  if (startDate && endDate) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24))
    days = Math.max(1, diffDays)
  }

  const numAdults = Math.max(1, adults)
  const numChildren = Math.max(0, children)
  const totalParty = numAdults + numChildren * 0.5

  // 1. Distance-based Roundtrip Transport Cost (INR per adult)
  let transportPerAdult = 0
  if (isDomestic) {
    if (distKm <= 80) {
      transportPerAdult = 200 // Local auto / cab / bus
    } else if (distKm <= 400) {
      // e.g. Bengaluru to Chennai (~290 km)
      transportPerAdult = 800 // Bus or sleeper train round-trip
    } else if (distKm <= 900) {
      // e.g. Bengaluru to Goa (~460 km) / Mumbai
      transportPerAdult = 1800
    } else if (distKm <= 1800) {
      // e.g. Bengaluru to New Delhi (~1740 km)
      transportPerAdult = 3500
    } else {
      transportPerAdult = 5000
    }
  } else {
    // International
    if (distKm <= 3500) {
      // e.g. Dubai, Singapore, Bangkok
      transportPerAdult = 14000
    } else if (distKm <= 8000) {
      // e.g. Europe, Japan
      transportPerAdult = 38000
    } else {
      // e.g. US, Australia
      transportPerAdult = 60000
    }
  }

  const totalTransportCost = Math.round(transportPerAdult * numAdults)

  // 2. Minimum Living Cost per day (INR per effective person: accommodation + food + basic daily travel)
  let dailyLivingPerPerson = 600 // Domestic default
  if (!isDomestic) {
    const destLower = (destinationCountry || '').toLowerCase()
    if (destLower.includes('switzerland') || destLower.includes('states') || destLower.includes('kingdom') || destLower.includes('japan') || destLower.includes('france') || destLower.includes('australia')) {
      dailyLivingPerPerson = 5500
    } else {
      dailyLivingPerPerson = 2500
    }
  }

  const totalLivingCost = Math.round(dailyLivingPerPerson * days * totalParty)
  const minAmountINR = totalTransportCost + totalLivingCost

  const reasoning = `Distance between ${originCity || 'Origin'} and ${destinationCity || 'Destination'} is ~${distKm} km (${isDomestic ? 'Domestic' : 'International'}). Minimum required for ${days} day(s) & ${numAdults} adult(s) includes ₹${totalTransportCost.toLocaleString()} round-trip transit and ₹${totalLivingCost.toLocaleString()} stay/food.`

  return {
    minAmountINR,
    distanceKm: distKm,
    isDomestic,
    transportCostINR: totalTransportCost,
    livingCostINR: totalLivingCost,
    days,
    totalParty,
    reasoning,
  }
}
