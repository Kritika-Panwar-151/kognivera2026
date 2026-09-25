import { useState } from 'react'
import type { Expense, Trip } from '../../types'

export function useExpensesHub(trips: Trip[]) {
  const [personalExpenses, setPersonalExpenses] = useState<Expense[]>([
    {
      id: 'pexp_01',
      merchant: 'Espresso & Gelato in Rome',
      title: 'Espresso & Gelato in Rome',
      amount: 8.5,
      currency: 'EUR',
      convertedAmount: 8.5,
      paidBy: 'usr_you',
      tripId: 'trip_01',
      homeAmount: 799,
      date: '2026-09-16',
      category: 'Food',
      payerName: 'You (Aisha)',
      isShared: false,
    },
    {
      id: 'pexp_02',
      merchant: 'Leather Wallet Souvenir',
      title: 'Leather Wallet Souvenir',
      amount: 25.0,
      currency: 'EUR',
      convertedAmount: 25.0,
      paidBy: 'usr_you',
      tripId: 'trip_01',
      homeAmount: 2350,
      date: '2026-09-15',
      category: 'Shopping',
      payerName: 'You (Aisha)',
      isShared: false,
    },
  ])

  const [tripExpenses, setTripExpenses] = useState<Expense[]>([
    {
      id: 'exp_01',
      merchant: 'Hotel Roma — 3 Nights Stay',
      title: 'Hotel Roma — 3 Nights Stay',
      amount: 334.0,
      currency: 'EUR',
      convertedAmount: 334.0,
      paidBy: 'usr_you',
      tripId: 'trip_01',
      homeAmount: 31396,
      date: '2026-09-14',
      category: 'Accommodation',
      payerName: 'You (Aisha)',
      isShared: true,
      splitType: 'equal',
    },
    {
      id: 'exp_02',
      merchant: 'Trattoria da Luigi Dinner',
      title: 'Trattoria da Luigi Dinner',
      amount: 42.0,
      currency: 'EUR',
      convertedAmount: 42.0,
      paidBy: 'usr_02',
      tripId: 'trip_01',
      homeAmount: 3948,
      date: '2026-09-15',
      category: 'Food',
      payerName: 'Ravi Sharma',
      isShared: true,
      splitType: 'equal',
    },
  ])

  const totalPersonalSpend = personalExpenses.reduce((sum, e) => sum + (e.homeAmount || 0), 0)

  return {
    personalExpenses,
    tripExpenses,
    totalPersonalSpend,
    setPersonalExpenses,
    setTripExpenses,
  }
}
