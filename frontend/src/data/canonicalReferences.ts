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
  { id: 'cty_delhi', name: 'New Delhi', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata' },
  { id: 'cty_mumbai', name: 'Mumbai', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata' },
  { id: 'cty_bangalore', name: 'Bengaluru', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata' },
  { id: 'cty_goa', name: 'Goa', countryId: 'cnt_in', countryCode: 'IN', timezone: 'Asia/Kolkata' },
  { id: 'cty_paris', name: 'Paris', countryId: 'cnt_fr', countryCode: 'FR', timezone: 'Europe/Paris' },
  { id: 'cty_rome', name: 'Rome', countryId: 'cnt_it', countryCode: 'IT', timezone: 'Europe/Rome' },
  { id: 'cty_milan', name: 'Milan', countryId: 'cnt_it', countryCode: 'IT', timezone: 'Europe/Rome' },
  { id: 'cty_london', name: 'London', countryId: 'cnt_gb', countryCode: 'GB', timezone: 'Europe/London' },
  { id: 'cty_zurich', name: 'Zurich', countryId: 'cnt_ch', countryCode: 'CH', timezone: 'Europe/Zurich' },
  { id: 'cty_tokyo', name: 'Tokyo', countryId: 'cnt_jp', countryCode: 'JP', timezone: 'Asia/Tokyo' },
  { id: 'cty_dubai', name: 'Dubai', countryId: 'cnt_ae', countryCode: 'AE', timezone: 'Asia/Dubai' },
  { id: 'cty_singapore', name: 'Singapore', countryId: 'cnt_sg', countryCode: 'SG', timezone: 'Asia/Singapore' },
  { id: 'cty_bangkok', name: 'Bangkok', countryId: 'cnt_th', countryCode: 'TH', timezone: 'Asia/Bangkok' },
  { id: 'cty_newyork', name: 'New York', countryId: 'cnt_us', countryCode: 'US', timezone: 'America/New_York' },
  { id: 'cty_sydney', name: 'Sydney', countryId: 'cnt_au', countryCode: 'AU', timezone: 'Australia/Sydney' },
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
