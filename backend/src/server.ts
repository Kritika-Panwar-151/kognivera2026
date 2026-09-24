import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TripWallet API', version: '1.0.0' })
})

// Calculate Largest Remainder Split
app.post('/api/splits/largest-remainder', (req, res) => {
  const { totalAmount, memberIds } = req.body
  const numAdults = Array.isArray(memberIds) ? memberIds.length : 1
  const totalCents = Math.round(parseFloat(totalAmount) * 100)
  const baseShareCents = Math.floor(totalCents / numAdults)
  const remainderCents = totalCents - baseShareCents * numAdults

  const splits = (memberIds || []).map((userId: string, index: number) => {
    const bonus = index < remainderCents ? 1 : 0
    const share = (baseShareCents + bonus) / 100
    return {
      userId,
      amount: share.toFixed(2),
      currency: 'INR',
    }
  })

  res.json({ totalAmount, splits, zeroDiscrepancy: true })
})

// Dated FX Conversion
app.get('/api/fx/convert', (req, res) => {
  const { from = 'EUR', to = 'INR', amount = '1' } = req.query
  const rates: Record<string, number> = { EUR: 94.0, USD: 86.5, GBP: 112.4, INR: 1.0 }
  const rate = rates[String(from).toUpperCase()] || 1.0
  const converted = Math.round(parseFloat(String(amount)) * rate)
  res.json({ from, to, amount, rate, convertedAmount: converted })
})

app.listen(PORT, () => {
  console.log(`TripWallet backend running on port ${PORT}`)
})
