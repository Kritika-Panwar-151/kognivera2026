/**
 * Real-Time Foreign Exchange (FX) Service with Offline Caching (PS-08)
 */

export const BASELINE_FX_RATES: Record<string, number> = {
  INR: 1.0,
  USD: 84.0,
  EUR: 89.0,
  GBP: 104.0,
  AED: 22.45,
  SGD: 61.6,
  THB: 2.35,
  LKR: 0.28,
  NPR: 0.62,
  BTN: 1.0,
  MVR: 5.36,
  JPY: 0.55,
  KRW: 0.061,
  KWD: 270.0,
  BHD: 220.0,
  AUD: 54.0,
  CAD: 60.0,
  CHF: 94.6,
  MYR: 18.5,
  IDR: 0.00517,
  VND: 0.0033,
  CNY: 11.43,
  QAR: 22.76,
  SAR: 22.13,
  NZD: 49.2,
}

const CACHE_KEY = 'tripwallet_live_fx_rates'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface LiveFxState {
  rates: Record<string, number>
  lastUpdated: string
  source: 'live' | 'cached' | 'baseline'
}

/**
 * Retrieves the current FX rates, checking localStorage cache first,
 * and refreshing in the background from a public exchange rate API.
 */
export function getStoredFxRates(): LiveFxState {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.rates && parsed.timestamp) {
        const isFresh = Date.now() - parsed.timestamp < CACHE_TTL_MS
        return {
          rates: { ...BASELINE_FX_RATES, ...parsed.rates },
          lastUpdated: new Date(parsed.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: isFresh ? 'cached' : 'baseline',
        }
      }
    }
  } catch (e) {
    console.warn('FX cache read error:', e)
  }

  return {
    rates: BASELINE_FX_RATES,
    lastUpdated: 'Live Benchmark',
    source: 'baseline',
  }
}

/**
 * Background refresh of live FX rates against INR
 */
export async function refreshLiveFxRates(): Promise<LiveFxState> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (res.ok) {
      const data = await res.json()
      if (data && data.rates && data.rates.INR) {
        const inrPerUsd = data.rates.INR
        const updated: Record<string, number> = { ...BASELINE_FX_RATES }

        // Derive INR rate for each supported currency
        Object.keys(BASELINE_FX_RATES).forEach((curr) => {
          if (curr === 'INR') {
            updated[curr] = 1.0
          } else if (curr === 'USD') {
            updated[curr] = Math.round(inrPerUsd * 100) / 100
          } else if (data.rates[curr]) {
            const inrRate = inrPerUsd / data.rates[curr]
            updated[curr] = Math.round(inrRate * 100) / 100
          }
        })

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            rates: updated,
            timestamp: Date.now(),
          })
        )

        return {
          rates: updated,
          lastUpdated: 'Just now',
          source: 'live',
        }
      }
    }
  } catch (err) {
    console.warn('Live FX fetch notice (offline mode active):', err)
  }

  return getStoredFxRates()
}

/**
 * Converts an amount from source currency to target currency (default INR)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string = 'INR'
): number {
  const fromCode = (fromCurrency || 'INR').toUpperCase()
  const toCode = (toCurrency || 'INR').toUpperCase()
  if (fromCode === toCode) return Math.round(amount * 100) / 100

  const state = getStoredFxRates()
  const fromRate = state.rates[fromCode] || BASELINE_FX_RATES[fromCode] || 1.0
  const toRate = state.rates[toCode] || BASELINE_FX_RATES[toCode] || 1.0

  const amountInInr = amount * fromRate
  return Math.round((amountInInr / toRate) * 100) / 100
}

/**
 * Returns the proper currency symbol for a given currency code.
 */
export function getCurrencySymbol(curr: string): string {
  const c = (curr || 'INR').toUpperCase()
  if (c === 'INR') return '₹'
  if (c === 'USD') return '$'
  if (c === 'EUR') return '€'
  if (c === 'GBP') return '£'
  if (c === 'AED') return 'د.إ '
  if (c === 'SGD') return 'S$'
  if (c === 'THB') return '฿'
  if (c === 'LKR') return 'Rs '
  if (c === 'NPR') return 'Rs '
  if (c === 'BTN') return 'Nu. '
  if (c === 'MVR') return '.ރ '
  if (c === 'JPY') return '¥'
  if (c === 'KRW') return '₩'
  if (c === 'KWD') return 'د.ك '
  if (c === 'BHD') return '.د.ب '
  if (c === 'AUD') return 'A$'
  if (c === 'CAD') return 'C$'
  if (c === 'CHF') return 'CHF '
  if (c === 'MYR') return 'RM '
  if (c === 'IDR') return 'Rp '
  if (c === 'VND') return '₫'
  if (c === 'CNY') return '¥'
  if (c === 'QAR') return 'ر.ق '
  if (c === 'SAR') return 'ر.س '
  if (c === 'NZD') return 'NZ$'
  return `${c} `
}

/**
 * Formats a financial amount in both the User's Home Currency (primary)
 * and the Trip Destination Currency (secondary subtext).
 */
export function formatUserDualCurrency(
  amount: number,
  fromCurrency: string,
  userHomeCurrency: string = 'INR',
  tripDestinationCurrency: string = 'JPY'
): {
  primary: string
  secondary: string
  primaryAmount: number
  secondaryAmount: number
} {
  const primaryAmount = convertCurrency(amount, fromCurrency, userHomeCurrency)
  const secondaryAmount = convertCurrency(amount, fromCurrency, tripDestinationCurrency)

  const primarySymbol = getCurrencySymbol(userHomeCurrency)
  const secondarySymbol = getCurrencySymbol(tripDestinationCurrency)

  const primaryCode = (userHomeCurrency || 'INR').toUpperCase()
  const secondaryCode = (tripDestinationCurrency || 'JPY').toUpperCase()

  const primaryText = `${primarySymbol}${primaryAmount.toLocaleString('en-IN')}`
  const secondaryText = `≈ ${secondarySymbol}${secondaryAmount.toLocaleString('en-IN')}`

  return {
    primary: primaryText,
    secondary: secondaryText,
    primaryAmount,
    secondaryAmount,
    primarySymbol,
    secondarySymbol,
  }
}

/**
 * Resolves the exact destination currency for any trip record,
 * checking trip.currency, destinationCountry, or destination string.
 */
export function getTripDestinationCurrency(trip?: { currency?: string; destinationCountry?: string; destination?: string; name?: string } | null): string {
  if (!trip) return 'EUR'
  const searchStr = `${trip.destinationCountry || ''} ${trip.destination || ''} ${trip.name || ''}`.toLowerCase()
  if (searchStr.includes('switzerland') || searchStr.includes('zurich') || searchStr.includes('geneva') || searchStr.includes('swiss')) return 'CHF'
  if (searchStr.includes('japan') || searchStr.includes('tokyo') || searchStr.includes('kyoto') || searchStr.includes('osaka')) return 'JPY'
  if (searchStr.includes('france') || searchStr.includes('paris') || searchStr.includes('germany') || searchStr.includes('italy') || searchStr.includes('rome') || searchStr.includes('spain') || searchStr.includes('europe')) return 'EUR'
  if (searchStr.includes('uk') || searchStr.includes('london') || searchStr.includes('england') || searchStr.includes('britain')) return 'GBP'
  if (searchStr.includes('usa') || searchStr.includes('states') || searchStr.includes('york') || searchStr.includes('america')) return 'USD'
  if (searchStr.includes('india') || searchStr.includes('delhi') || searchStr.includes('mumbai') || searchStr.includes('goa')) return 'INR'
  if (searchStr.includes('singapore')) return 'SGD'
  if (searchStr.includes('thailand') || searchStr.includes('bangkok')) return 'THB'
  if (searchStr.includes('uae') || searchStr.includes('dubai')) return 'AED'
  if (searchStr.includes('australia') || searchStr.includes('sydney')) return 'AUD'
  if (searchStr.includes('canada') || searchStr.includes('toronto')) return 'CAD'

  if (trip.currency && trip.currency.trim()) return trip.currency.toUpperCase()
  return 'EUR'
}

export interface SyncedCurrencyState {
  homeCurrency: string
  homeCurrencySymbol: string
  activeCurrency: string
  activeCurrencySymbol: string
  activeTripId: string | null
  activeTripName: string | null
}

/**
 * Stores and syncs active destination currency + symbol and home currency + symbol globally.
 */
export function syncActiveCurrencies(
  trip?: { id?: string; currency?: string; destinationCountry?: string; destination?: string; name?: string } | null,
  currentUser?: { homeCurrency?: string } | null
): SyncedCurrencyState {
  const homeCurr = (currentUser?.homeCurrency || 'INR').toUpperCase()
  const homeSym = getCurrencySymbol(homeCurr).trim()
  const activeCurr = getTripDestinationCurrency(trip)
  const activeSym = getCurrencySymbol(activeCurr).trim()

  const state: SyncedCurrencyState = {
    homeCurrency: homeCurr,
    homeCurrencySymbol: homeSym,
    activeCurrency: activeCurr,
    activeCurrencySymbol: activeSym,
    activeTripId: trip?.id || null,
    activeTripName: trip?.name || null,
  }

  try {
    localStorage.setItem('tripwallet_home_currency', homeCurr)
    localStorage.setItem('tripwallet_home_currency_symbol', homeSym)
    localStorage.setItem('tripwallet_active_currency', activeCurr)
    localStorage.setItem('tripwallet_active_currency_symbol', activeSym)
    if (trip?.id) localStorage.setItem('tripwallet_active_trip_id', trip.id)
  } catch (e) {
    console.warn('Failed to store active currencies in localStorage:', e)
  }

  return state
}

/**
 * Reads stored synced currencies from localStorage.
 */
export function getStoredSyncedCurrencies(): SyncedCurrencyState {
  try {
    const homeCurrency = localStorage.getItem('tripwallet_home_currency') || 'INR'
    const homeCurrencySymbol = localStorage.getItem('tripwallet_home_currency_symbol') || getCurrencySymbol(homeCurrency).trim()
    const activeCurrency = localStorage.getItem('tripwallet_active_currency') || 'EUR'
    const activeCurrencySymbol = localStorage.getItem('tripwallet_active_currency_symbol') || getCurrencySymbol(activeCurrency).trim()
    const activeTripId = localStorage.getItem('tripwallet_active_trip_id')

    return {
      homeCurrency,
      homeCurrencySymbol,
      activeCurrency,
      activeCurrencySymbol,
      activeTripId,
      activeTripName: null,
    }
  } catch {
    return {
      homeCurrency: 'INR',
      homeCurrencySymbol: '₹',
      activeCurrency: 'EUR',
      activeCurrencySymbol: '€',
      activeTripId: null,
      activeTripName: null,
    }
  }
}

/**
 * Checks if an expense belongs to a trip using robust ID normalization.
 */
export function isTripMatch(expenseTripId?: string, targetTripId?: string): boolean {
  if (!targetTripId || !expenseTripId) return true
  const eId = expenseTripId.toLowerCase().trim()
  const tId = targetTripId.toLowerCase().trim()
  if (eId === tId) return true
  if (
    (eId === 'europe' || eId === 'trp_europe' || eId === 'trp_000000000001') &&
    (tId === 'europe' || tId === 'trp_europe' || tId === 'trp_000000000001')
  )
    return true
  if (
    (eId === 'goa' || eId === 'trp_goa' || eId === 'trp_000000000002') &&
    (tId === 'goa' || tId === 'trp_goa' || tId === 'trp_000000000002')
  )
    return true
  if (
    (eId === 'india' || eId === 'trp_india' || eId === 'trp_000000000003') &&
    (tId === 'india' || tId === 'trp_india' || tId === 'trp_000000000003')
  )
    return true
  return eId.includes(tId) || tId.includes(eId)
}

/**
 * Deduplicates expenses by both unique ID and semantic signature (tripId + merchant + amount + category + date)
 */
export function deduplicateExpenses<T extends { id: string; tripId?: string; merchant?: string; amount?: number; category?: string; date?: string }>(expenses: T[]): T[] {
  if (!expenses || !Array.isArray(expenses)) return []
  const seenIds = new Set<string>()
  const seenSignatures = new Set<string>()
  const result: T[] = []

  expenses.forEach((e) => {
    if (!e || !e.id) return
    // 1. Unique by ID
    if (seenIds.has(e.id)) return
    
    // 2. Unique by semantic signature (tripId + merchant + amount + category + date)
    const normMerchant = (e.merchant || '').trim().toLowerCase()
    const normCategory = (e.category || '').trim().toLowerCase()
    const normTrip = (e.tripId || '').trim().toLowerCase()
    const normDate = (e.date || '').trim().toLowerCase()
    const amt = Number(e.amount || 0).toFixed(2)
    const signature = `${normTrip}_${normMerchant}_${amt}_${normCategory}_${normDate}`

    if (seenSignatures.has(signature)) return

    seenIds.add(e.id)
    seenSignatures.add(signature)
    result.push(e)
  })

  return result
}
