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
  const state = getStoredFxRates()
  const fromRate = state.rates[fromCurrency.toUpperCase()] || 1.0
  const toRate = state.rates[toCurrency.toUpperCase()] || 1.0

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
  }
}

/**
 * Resolves the exact destination currency for any trip record,
 * checking trip.currency, destinationCountry, or destination string.
 */
export function getTripDestinationCurrency(trip?: { currency?: string; destinationCountry?: string; destination?: string; name?: string } | null): string {
  if (!trip) return 'USD'
  const searchStr = `${trip.destinationCountry || ''} ${trip.destination || ''} ${trip.name || ''}`.toLowerCase()
  if (searchStr.includes('switzerland') || searchStr.includes('zurich') || searchStr.includes('geneva')) return 'CHF'
  if (searchStr.includes('japan') || searchStr.includes('tokyo') || searchStr.includes('kyoto') || searchStr.includes('osaka')) return 'JPY'
  if (searchStr.includes('france') || searchStr.includes('paris') || searchStr.includes('germany') || searchStr.includes('italy') || searchStr.includes('rome') || searchStr.includes('spain')) return 'EUR'
  if (searchStr.includes('uk') || searchStr.includes('london') || searchStr.includes('england') || searchStr.includes('britain')) return 'GBP'
  if (searchStr.includes('usa') || searchStr.includes('states') || searchStr.includes('york') || searchStr.includes('america')) return 'USD'
  if (searchStr.includes('india') || searchStr.includes('delhi') || searchStr.includes('mumbai') || searchStr.includes('goa')) return 'INR'
  if (searchStr.includes('singapore')) return 'SGD'
  if (searchStr.includes('thailand') || searchStr.includes('bangkok')) return 'THB'
  if (searchStr.includes('uae') || searchStr.includes('dubai')) return 'AED'
  if (searchStr.includes('australia') || searchStr.includes('sydney')) return 'AUD'
  if (searchStr.includes('canada') || searchStr.includes('toronto')) return 'CAD'

  if (trip.currency && trip.currency.trim()) return trip.currency.toUpperCase()
  return 'USD'
}
