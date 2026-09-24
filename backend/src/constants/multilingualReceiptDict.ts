/**
 * Multilingual Receipt Context Dictionaries (PS-08)
 * 
 * Supports Italian (it), French (fr), German (de), Spanish (es), Hindi (hi), and English (en).
 * Provides domain-specific taxonomies for:
 * 1. Total amount identifiers (e.g. Totale, Montant, Gesamt, कुल)
 * 2. Tax/VAT identifiers (e.g. IVA, TVA, MwSt, GST)
 * 3. Currency symbols & codes (€, $, £, ₹, CHF, JPY)
 * 4. Expense category keywords (Ristorante, Albergo, Treno, Farmacia)
 * 5. Common noise & exclusion phrases (Grazie, Arrivederci, Coperto, Servizio)
 */

export interface LanguageReceiptContext {
  languageCode: string
  languageName: string
  totalKeywords: string[]
  subtotalKeywords: string[]
  taxKeywords: string[]
  dateFormats: string[]
  categoryMappings: Record<string, string[]>
  noisePhrases: string[]
}

export const MULTILINGUAL_RECEIPT_DICTIONARIES: Record<string, LanguageReceiptContext> = {
  // 1. Italian (Crucial for PS-08 Rome/Europe Adventure dataset)
  it: {
    languageCode: 'it',
    languageName: 'Italian',
    totalKeywords: [
      'totale',
      'totale euro',
      'totale dovuto',
      'totale complessivo',
      'importo totale',
      'saldo',
      'pagato',
      'totale scontrino',
      'carta di credito',
      'contanti',
    ],
    subtotalKeywords: ['subtotale', 'imponibile', 'lordo'],
    taxKeywords: ['iva', 'imposta', 'esente iva', 'aliquota'],
    dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY'],
    categoryMappings: {
      food: [
        'ristorante',
        'trattoria',
        'osteria',
        'pizzeria',
        'bar',
        'caffe',
        'pasticceria',
        'gelateria',
        'panetteria',
        'alimentari',
        'pasta',
        'pizza',
        'vino',
        'birra',
        'coperto',
      ],
      accommodation: ['albergo', 'hotel', 'ostello', 'b&b', 'camera', 'soggiorno', 'pernottamento', 'tassa di soggiorno'],
      transport: ['treno', 'ferrovia', 'trenitalia', 'italo', 'metro', 'metropolitana', 'autobus', 'taxi', 'biglietto', 'corsa', 'carburante', 'benzina', 'pedaggio'],
      activities: ['museo', 'musei vaticani', 'colosseo', 'guida', 'tour', 'biglietteria', 'ingresso', 'monumento', 'visita', 'teatro', 'cinema'],
      shopping: ['souvenir', 'farmacia', 'negozio', 'supermercato', 'abbigliamento', 'scarpe', 'libreria', 'tabacchi'],
    },
    noisePhrases: ['grazie per la visita', 'arrivederci', 'scontrino fiscale', 'documento commerciale', 'partita iva', 'grazie e arrivederci'],
  },

  // 2. French (Crucial for Paris/France dataset)
  fr: {
    languageCode: 'fr',
    languageName: 'French',
    totalKeywords: ['total', 'montant total', 'total ttc', 'net a payer', 'total facture', 'somme due', 'carte bancaire'],
    subtotalKeywords: ['sous-total', 'total ht', 'net ht'],
    taxKeywords: ['tva', 'taxe', 'taux tva'],
    dateFormats: ['DD/MM/YYYY', 'DD.MM.YYYY'],
    categoryMappings: {
      food: ['restaurant', 'bistrot', 'brasserie', 'cafe', 'boulangerie', 'creperie', 'supermarche', 'repas', 'dejeuner', 'diner'],
      accommodation: ['hotel', 'hebergement', 'chambre', 'nuit', 'taxe de sejour'],
      transport: ['sncf', 'ratp', 'metro', 'train', 'bus', 'billet', 'peage', 'taxi', 'vtc', 'aeroport'],
      activities: ['louvre', 'musee', 'visite', 'billetterie', 'monument', 'tour eiffel', 'spectacle'],
      shopping: ['boutique', 'pharmacie', 'cadeaux', 'souvenir', 'mode'],
    },
    noisePhrases: ['merci de votre visite', 'a bientot', 'au revoir', 'ticket de caisse', 'ne pas jeter sur la voie publique'],
  },

  // 3. German
  de: {
    languageCode: 'de',
    languageName: 'German',
    totalKeywords: ['gesamt', 'gesamtbetrag', 'summe', 'total', 'zu zahlen', 'kartenzahlung', 'bar'],
    subtotalKeywords: ['zwischensumme', 'nettobetrag'],
    taxKeywords: ['mwst', 'ust', 'mehrwertsteuer'],
    dateFormats: ['DD.MM.YYYY', 'YYYY-MM-DD'],
    categoryMappings: {
      food: ['restaurant', 'gasthof', 'brauhaus', 'cafe', 'backerei', 'speisen', 'getranke', 'supermarkt'],
      accommodation: ['hotel', 'pension', 'zimmer', 'ubernachtung', 'kurtaxe'],
      transport: ['bahn', 'db', 'fahrkarte', 'u-bahn', 's-bahn', 'strassenbahn', 'flug', 'kraftstoff'],
      activities: ['museum', 'eintritt', 'fuhrung', 'schloss', 'karte'],
      shopping: ['apotheke', 'geschaft', 'drogerie', 'einkauf'],
    },
    noisePhrases: ['vielen dank fur ihren besuch', 'auf wiedersehen', 'kassenbon', 'beleg'],
  },

  // 4. Spanish
  es: {
    languageCode: 'es',
    languageName: 'Spanish',
    totalKeywords: ['total', 'importe total', 'total a pagar', 'total factura', 'tarjeta', 'efectivo'],
    subtotalKeywords: ['subtotal', 'base imponible'],
    taxKeywords: ['iva', 'impuesto'],
    dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY'],
    categoryMappings: {
      food: ['restaurante', 'bar', 'cafeteria', 'tapas', 'meson', 'supermercado', 'comida', 'cena'],
      accommodation: ['hotel', 'hostal', 'habitacion', 'alojamiento'],
      transport: ['renfe', 'metro', 'autobus', 'billete', 'gasolina', 'peaje'],
      activities: ['museo', 'entrada', 'visita guiada', 'excursion'],
      shopping: ['farmacia', 'tienda', 'recuerdos'],
    },
    noisePhrases: ['gracias por su visita', 'hasta pronto', 'factura simplificada'],
  },

  // 5. Hindi (en-IN / hi for domestic trips like Goa)
  hi: {
    languageCode: 'hi',
    languageName: 'Hindi',
    totalKeywords: ['कुल', 'कुल राशि', 'देय राशि', 'टोटल', 'total', 'grand total', 'net amount'],
    subtotalKeywords: ['सबटोटल', 'subtotal'],
    taxKeywords: ['gst', 'cgst', 'sgst', 'कर'],
    dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY'],
    categoryMappings: {
      food: ['होटल', 'रेस्टोरेंट', 'ढाबा', 'खाना', 'चाय', 'नाश्ता', 'restaurant', 'dhaba', 'cafe', 'swiggy', 'zomato'],
      accommodation: ['होटल', 'रिसॉर्ट', 'कमरा', 'stay', 'hotel', 'resort', 'homestay'],
      transport: ['ट्रेन', 'बस', 'टैक्सी', 'ऑटो', 'रेलवे', 'irctc', 'uber', 'ola', 'flight', 'petrol'],
      activities: ['टिकट', 'प्रवेश', 'नाव', 'safari', 'scuba', 'water sports', 'monument'],
      shopping: ['दुकान', 'बाजार', 'खरीदारी', 'supermarket', 'medical'],
    },
    noisePhrases: ['धन्यवाद', 'फिर पधारें', 'thank you', 'visit again'],
  },

  // 6. English (Default fallback)
  en: {
    languageCode: 'en',
    languageName: 'English',
    totalKeywords: ['total', 'grand total', 'amount due', 'balance due', 'total amount', 'net total', 'paid', 'visa', 'mastercard'],
    subtotalKeywords: ['subtotal', 'sub-total', 'net amount'],
    taxKeywords: ['tax', 'vat', 'gst', 'sales tax'],
    dateFormats: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    categoryMappings: {
      food: ['restaurant', 'cafe', 'bar', 'diner', 'bakery', 'bistro', 'food', 'coffee', 'groceries', 'supermarket'],
      accommodation: ['hotel', 'resort', 'hostel', 'inn', 'room', 'lodging', 'airbnb'],
      transport: ['flight', 'airline', 'train', 'rail', 'subway', 'metro', 'bus', 'taxi', 'uber', 'lyft', 'fuel', 'toll'],
      activities: ['tour', 'museum', 'ticket', 'admission', 'guide', 'excursion', 'attraction', 'park'],
      shopping: ['store', 'shop', 'market', 'pharmacy', 'souvenir', 'apparel', 'retail'],
    },
    noisePhrases: ['thank you', 'customer copy', 'merchant copy', 'visit again', 'have a nice day'],
  },
}

/**
 * Returns prompt context guidelines to inject into Gemini Vision OCR.
 */
export function getMultilingualOCRPromptContext(): string {
  return `
MULTILINGUAL CONTEXT & TAXONOMY GUIDELINES:
- **Italian (it)**: Look for total in "Totale", "Importo Totale", "Totale Euro". Check for "Coperto" (table cover charge, category: food). "Ristorante/Trattoria" -> food. "Biglietto/Treno" -> transport.
- **French (fr)**: Look for total in "Total TTC", "Net à payer", "Montant Total". "TVA" -> tax. "Bistrot/Brasserie" -> food. "SNCF/RATP" -> transport.
- **German (de)**: Look for total in "Gesamtbetrag", "Summe", "Zu zahlen". "MwSt" -> tax.
- **Spanish (es)**: Look for total in "Importe Total", "Total a pagar". "IVA" -> tax.
- **Hindi/India (hi/en-IN)**: Look for "कुल राशि", "Total", "Grand Total". "CGST/SGST" -> tax.
- **Date parsing**: Standardize all dates into ISO 'YYYY-MM-DD'. If year is missing, assume 2026.
- **Currency matching**: ISO-4217 strictly (EUR for €, INR for ₹ / Rs, USD for $, GBP for £).
- **Category taxonomy**: strictly one of: 'food', 'accommodation', 'transport', 'activities', 'shopping', 'misc'.
`
}
