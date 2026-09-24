/**
 * Multilingual Context Dictionary & Fast Entity Normalizer
 * 
 * Provides deterministic keyword, intent, and category dictionaries
 * for English, Hindi/Hinglish, Italian, Spanish, and French.
 * 
 * Guarantees zero-hallucination intent resolution and maps natural language
 * expressions directly to canonical application enums.
 */

export type CanonicalIntent = 
  | 'ADD_EXPENSE' 
  | 'CHECK_BUDGET' 
  | 'CHECK_ITINERARY' 
  | 'AFFORDABILITY_CHECK' 
  | 'NAVIGATE_PLACES' 
  | 'GENERAL_QUERY'

export type CanonicalCategory = 
  | 'Food' 
  | 'Transport' 
  | 'Accommodation' 
  | 'Activities' 
  | 'Shopping' 
  | 'Other'

export interface IntentMatchResult {
  intent: CanonicalIntent
  detectedLanguage: 'en' | 'hi' | 'it' | 'es' | 'fr' | 'unknown'
  confidence: number
  matchedKeyword?: string
}

// ============================================================================
// 1. INTENT DICTIONARY
// ============================================================================
export const INTENT_DICTIONARY: Record<CanonicalIntent, {
  en: string[]
  hi: string[] // Covers Hindi Devanagari & Hinglish Roman
  it: string[]
  es: string[]
  fr: string[]
}> = {
  ADD_EXPENSE: {
    en: ['add expense', 'add to expense', 'spent', 'paid', 'bought', 'cost', 'bill', 'add', 'record expense', 'log expense'],
    hi: ['kharcha add', 'kharcha jodo', 'kharch hua', 'paisa diya', 'bill bhara', 'jodo', 'kharcha', 'kharch kiya', 'daal do'],
    it: ['aggiungi spesa', 'ho speso', 'pagato', 'costo', 'scontrino', 'conto', 'registra spesa', 'metti spesa'],
    es: ['añadir gasto', 'he gastado', 'pagado', 'costó', 'cuenta', 'factura', 'registrar gasto'],
    fr: ['ajouter dépense', 'dépensé', 'payé', 'coûté', 'addition', 'facture', 'enregistrer dépense'],
  },
  CHECK_BUDGET: {
    en: ['how much left', 'budget remaining', 'remaining balance', 'safe daily limit', 'total spend', 'budget check', 'how much spent'],
    hi: ['kitna bacha', 'kitna paisa bacha', 'mera budget', 'bacha hua', 'kitna kharch hua', 'kitna baki', 'kul kharcha'],
    it: ['quanto è rimasto', 'budget rimanente', 'saldo rimasto', 'limite giornaliero', 'quanto ho speso'],
    es: ['cuánto queda', 'presupuesto restante', 'saldo disponible', 'cuánto he gastado'],
    fr: ['combien reste-t-il', 'budget restant', 'solde restant', 'dépense totale'],
  },
  CHECK_ITINERARY: {
    en: ['what is the plan', 'schedule today', 'itinerary', 'what to do next', 'activities today', 'tomorrow plan', 'show itinerary'],
    hi: ['aaj ka plan', 'aaj kya karna hai', 'itinerary dikhao', 'kahan ghumna hai', 'aaj ka schedule', 'kal ka plan'],
    it: ['qual è il programma', 'itinerario di oggi', 'cosa facciamo adesso', 'programma domani', 'mostra itinerario'],
    es: ['cuál es el plan', 'itinerario de hoy', 'qué hacer ahora', 'programa de hoy'],
    fr: ['quel est le programme', 'itinéraire d’aujourd’hui', 'que faire maintenant', 'planning du jour'],
  },
  AFFORDABILITY_CHECK: {
    en: ['can i afford', 'can we buy', 'is it within budget', 'too expensive', 'can i have'],
    hi: ['kya hum le sakte hain', 'kya ye afford kar sakte hain', 'kya budget me hai', 'zyada mehenga hai kya'],
    it: ['posso permettermi', 'è nel budget', 'possiamo comprare', 'troppo costoso'],
    es: ['puedo permitirme', 'está en el presupuesto', 'podemos comprar'],
    fr: ['puis-je me permettre', 'est-ce dans le budget', 'trop cher'],
  },
  NAVIGATE_PLACES: {
    en: ['directions to', 'near me', 'google maps', 'where is', 'walking distance', 'how far', 'location'],
    hi: ['rashta batao', 'aas paas kya hai', 'google map link', 'kitni door hai', 'kahan hai'],
    it: ['indicazioni per', 'vicino a me', 'mappa google', 'a che distanza', 'dove si trova'],
    es: ['cómo llegar a', 'cerca de mí', 'enlace de google maps', 'dónde está'],
    fr: ['comment aller à', 'près de moi', 'lien google maps', 'où se trouve'],
  },
  GENERAL_QUERY: {
    en: ['help', 'hello', 'hi', 'who are you'],
    hi: ['namaste', 'kaise ho', 'madad'],
    it: ['ciao', 'aiuto', 'buongiorno'],
    es: ['hola', 'ayuda', 'buenos días'],
    fr: ['bonjour', 'salut', 'aide'],
  },
}

// ============================================================================
// 2. CATEGORY DICTIONARY
// ============================================================================
export const CATEGORY_DICTIONARY: Record<CanonicalCategory, {
  en: string[]
  hi: string[]
  it: string[]
  es: string[]
  fr: string[]
}> = {
  Food: {
    en: ['dinner', 'lunch', 'breakfast', 'coffee', 'meal', 'cafe', 'restaurant', 'pizza', 'gelato', 'beer', 'drinks', 'snack', 'food', 'wine', 'trattoria'],
    hi: ['khana', 'nashta', 'dawat', 'chai', 'coffee', 'dhabe', 'peena', 'bhojan', 'mithai', 'lunch', 'dinner'],
    it: ['cena', 'pranzo', 'colazione', 'caffè', 'trattoria', 'pasticceria', 'cibo', 'pizza', 'vino', 'gelato'],
    es: ['cena', 'almuerzo', 'desayuno', 'comida', 'tapas', 'cafetería', 'vino', 'cerveza'],
    fr: ['dîner', 'déjeuner', 'petit-déjeuner', 'café', 'restaurant', 'repas', 'nourriture', 'vin'],
  },
  Transport: {
    en: ['metro', 'train', 'cab', 'taxi', 'uber', 'bus', 'flight', 'ticket', 'gas', 'petrol', 'tram', 'ferry'],
    hi: ['kiraya', 'auto', 'rickshaw', 'safar', 'ticket', 'gaadi', 'petrol', 'diesel', 'metro', 'train', 'bus'],
    it: ['treno', 'metro', 'biglietto', 'taxi', 'autobus', 'volo', 'traghetto', 'benzina'],
    es: ['metro', 'tren', 'billete', 'coche', 'taxi', 'vuelo', 'autobús', 'gasolina'],
    fr: ['métro', 'train', 'billet', 'taxi', 'bus', 'vol', 'essence'],
  },
  Accommodation: {
    en: ['hotel', 'hostel', 'airbnb', 'room', 'stay', 'checkout', 'resort', 'villa'],
    hi: ['kamra', 'hotel', 'stay', 'rukna', 'lodge'],
    it: ['albergo', 'hotel', 'camera', 'soggiorno', 'ostello'],
    es: ['hotel', 'alojamiento', 'habitación', 'estancia', 'hostal'],
    fr: ['hôtel', 'chambre', 'logement', 'séjour', 'auberge'],
  },
  Activities: {
    en: ['museum', 'entry', 'monument', 'colosseum', 'tour', 'ticket', 'sightseeing', 'guide', 'pass', 'vatican'],
    hi: ['darshan', 'tour', 'ghoomna', 'kila', 'mandir', 'entry pass', 'museum'],
    it: ['museo', 'monumento', 'colosseo', 'guida', 'biglietto d’ingresso', 'vaticano'],
    es: ['museo', 'monumento', 'entrada', 'visita guiada', 'excursión'],
    fr: ['musée', 'monument', 'visite', 'billet d’entrée', 'guide'],
  },
  Shopping: {
    en: ['souvenir', 'clothes', 'shopping', 'gifts', 'market', 'mall', 'shoes', 'bag'],
    hi: ['kharidari', 'kapde', 'samaana', 'tohfa', 'shopping', 'bazaar'],
    it: ['regali', 'souvenir', 'vestiti', 'spesa al mercato', 'acquisti'],
    es: ['recuerdos', 'compras', 'ropa', 'mercado', 'tienda'],
    fr: ['souvenirs', 'vêtements', 'achats', 'marché', 'cadeaux'],
  },
  Other: {
    en: ['misc', 'general', 'other', 'tip', 'donation'],
    hi: ['baki', 'anya', 'kharcha'],
    it: ['altro', 'varie', 'mancia'],
    es: ['otros', 'varios', 'propina'],
    fr: ['autre', 'divers', 'pourboire'],
  },
}

// ============================================================================
// 3. CURRENCY DICTIONARY
// ============================================================================
export const CURRENCY_DICTIONARY: Record<string, string[]> = {
  INR: ['₹', 'rs', 'rs.', 'rupee', 'rupees', 'inr', 'rupya', 'rupaye'],
  EUR: ['€', 'eur', 'euro', 'euros'],
  USD: ['$', 'usd', 'dollar', 'dollars', 'bucks'],
  GBP: ['£', 'gbp', 'pound', 'pounds'],
  JPY: ['¥', 'jpy', 'yen'],
}

// ============================================================================
// DETERMINISTIC MATCHING UTILITIES
// ============================================================================

/**
 * Rapidly match text against the multilingual intent dictionary
 */
export function matchIntentFromText(input: string): IntentMatchResult {
  const lower = input.toLowerCase().trim()

  for (const [intent, langMap] of Object.entries(INTENT_DICTIONARY) as [CanonicalIntent, any][]) {
    for (const [lang, keywords] of Object.entries(langMap) as [string, string[]][]) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          return {
            intent,
            detectedLanguage: lang as any,
            confidence: 0.95,
            matchedKeyword: kw,
          }
        }
      }
    }
  }

  // Regex fallback: If input starts with or contains numbers + "add" / "spent"
  if (/\b(?:add|\+|spent|kharch|speso|pagado)\b/i.test(lower) || /\b\d+(?:\.\d+)?\b/i.test(lower)) {
    return {
      intent: 'ADD_EXPENSE',
      detectedLanguage: 'en',
      confidence: 0.75,
    }
  }

  return {
    intent: 'GENERAL_QUERY',
    detectedLanguage: 'unknown',
    confidence: 0.5,
  }
}

/**
 * Resolve canonical category using multilingual dictionary
 */
export function matchCategoryFromText(input: string): CanonicalCategory {
  const lower = input.toLowerCase().trim()

  for (const [category, langMap] of Object.entries(CATEGORY_DICTIONARY)) {
    for (const keywords of Object.values(langMap)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          return category as CanonicalCategory
        }
      }
    }
  }

  return 'Other'
}

/**
 * Resolve currency code from text or symbols
 */
export function matchCurrencyFromText(input: string, fallback: string = 'INR'): string {
  const lower = input.toLowerCase()
  for (const [currency, symbols] of Object.entries(CURRENCY_DICTIONARY)) {
    for (const sym of symbols) {
      if (lower.includes(sym)) {
        return currency
      }
    }
  }
  return fallback
}
