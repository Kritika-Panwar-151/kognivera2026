import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { parseReceiptImage, persistReceiptAndExpenseToDB } from './services/geminiOcrService'
import { calculateLargestRemainderSplit } from './services/splitEngine'
import { MULTILINGUAL_RECEIPT_DICTIONARIES } from './constants/multilingualReceiptDict'

// Load environment variables from project root .env and local .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
// Support base64 image uploads up to 15MB
app.use(express.json({ limit: '15mb' }))
app.use(express.urlencoded({ extended: true, limit: '15mb' }))

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TripWallet Backend Services',
    version: '2.0.0',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
    supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL),
  })
})

// 2. Multilingual Receipt Dictionaries Inspector
app.get('/api/dictionaries', (req, res) => {
  res.json({
    supportedLanguages: Object.keys(MULTILINGUAL_RECEIPT_DICTIONARIES),
    dictionaries: MULTILINGUAL_RECEIPT_DICTIONARIES,
  })
})

// 3. Multimodal Receipt OCR Scan (Google Gemini Flash + Multilingual Dictionaries)
app.post('/api/ocr/scan', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 in request body' })
    }

    const parsedData = await parseReceiptImage(imageBase64, mimeType)
    res.json({ success: true, data: parsedData })
  } catch (err: any) {
    console.error('OCR scan error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// 4. Persist Receipt & Create Expense with Automatic Fair Splits
app.post('/api/ocr/persist-expense', async (req, res) => {
  try {
    const {
      receiptData,
      tripId = 'trp_europe',
      payerUserId = 'usr_000000000001',
      isShared = true,
      members = [
        { userId: 'usr_000000000001', isAdult: true },
        { userId: 'usr_ravi_1', isAdult: true },
        { userId: 'usr_asha', isAdult: true },
      ],
      homeCurrency = 'INR',
      exchangeRate = 94.0,
      filePath,
    } = req.body

    if (!receiptData) {
      return res.status(400).json({ error: 'Missing receiptData in request body' })
    }

    const result = await persistReceiptAndExpenseToDB({
      receiptData,
      tripId,
      payerUserId,
      isShared,
      members,
      homeCurrency,
      exchangeRate,
      filePath,
    })

    res.json({ success: true, ...result })
  } catch (err: any) {
    console.error('Persist receipt expense error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// 5. Calculate Fair Splits (Hamilton-Hare Largest Remainder Method)
app.post('/api/splits/largest-remainder', (req, res) => {
  try {
    const { totalAmount, currency = 'INR', members } = req.body

    if (!totalAmount) {
      return res.status(400).json({ error: 'Missing totalAmount in request body' })
    }

    // Adapt if caller sends plain member ID string array
    const normalizedMembers = Array.isArray(members)
      ? members.map((m) => (typeof m === 'string' ? { userId: m, isAdult: true } : m))
      : [{ userId: 'usr_you', isAdult: true }]

    const result = calculateLargestRemainderSplit(totalAmount, currency, normalizedMembers)
    res.json(result)
  } catch (err: any) {
    console.error('Split calculation error:', err)
    res.status(500).json({ error: err.message })
  }
})

// 6. Dated FX Conversion
app.get('/api/fx/convert', (req, res) => {
  const { from = 'EUR', to = 'INR', amount = '1' } = req.query
  const rates: Record<string, number> = { EUR: 94.0, USD: 86.5, GBP: 112.4, INR: 1.0, CHF: 99.5 }
  const rate = rates[String(from).toUpperCase()] || 1.0
  const converted = Math.round(parseFloat(String(amount)) * rate * 100) / 100
  res.json({ from, to, amount, rate, convertedAmount: converted })
})

app.listen(PORT, () => {
  console.log(`TripWallet backend running on port ${PORT}`)
})
