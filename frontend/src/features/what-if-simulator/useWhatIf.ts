import { useState } from 'react'

const FX_RATES: Record<string, number> = {
  EUR: 94.0,
  USD: 86.5,
  GBP: 112.4,
  INR: 1.0,
}

export function useWhatIf() {
  const [amount, setAmount] = useState('80')
  const [currency, setCurrency] = useState('EUR (€)')
  const [category, setCategory] = useState('Activities')
  const [description, setDescription] = useState('Sunset boat tour in Rome')
  const [simulated, setSimulated] = useState(false)

  const currCode = currency.split(' ')[0]
  const rate = FX_RATES[currCode] || 1.0
  const numAmount = parseFloat(amount) || 0
  const convertedAmount = Math.round(numAmount * rate)

  const tripBudget = 60000
  const currentSpent = 26172
  const daysLeft = 5

  const beforeProjected = 64872
  const afterProjected = beforeProjected + convertedAmount
  const canAfford = afterProjected <= tripBudget

  const newRemaining = Math.max(0, tripBudget - currentSpent - convertedAmount)
  const newSafeDaily = Math.round(newRemaining / daysLeft)

  return {
    amount,
    setAmount,
    currency,
    setCurrency,
    category,
    setCategory,
    description,
    setDescription,
    simulated,
    setSimulated,
    currCode,
    rate,
    numAmount,
    convertedAmount,
    beforeProjected,
    afterProjected,
    canAfford,
    newRemaining,
    newSafeDaily,
  }
}
