/**
 * Real-Time Foreign Exchange (FX) Service with Offline Caching (PS-08)
 */

export const BASELINE_FX_RATES: Record<string, number> = {
  EUR: 94.0,
  USD: 86.5,
  GBP: 112.4,
  SGD: 65.2,
  JPY: 0.58,
  CHF: 98.2,
  AED: 23.5,
  THB: 2.5,
  INR: 1.0,
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
