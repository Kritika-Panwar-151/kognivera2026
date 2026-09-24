import { useState } from 'react'
import type { Expense, Trip } from '../common/types'

export function useExpensesHub(trips: Trip[]) {
  const [personalExpenses, setPersonalExpenses] = useState<Expense[]>([
    {
      id: 'pexp_01',
      title: 'Espresso & Gelato in Rome',
      amount: 8.5,
      currency: 'EUR',
      homeAmount: 799,
      homeCurrency: 'INR',
      date: '2026-09-16',
      category: 'Food',
      payerName: 'You (Aisha)',
      payerAvatar: '👩🏽',
      isPersonal: true,
      splitWith: ['You (Aisha)'],
    },
    {
      id: 'pexp_02',
      title: 'Leather Wallet Souvenir',
      amount: 25.0,
      currency: 'EUR',
      homeAmount: 2350,
      homeCurrency: 'INR',
      date: '2026-09-15',
      category: 'Shopping',
      payerName: 'You (Aisha)',
      payerAvatar: '👩🏽',
      isPersonal: true,
      splitWith: ['You (Aisha)'],
    },
  ])

  const [tripExpenses, setTripExpenses] = useState<Expense[]>([
    {
      id: 'exp_01',
      title: 'Hotel Roma — 3 Nights Stay',
      amount: 334.0,
      currency: 'EUR',
      homeAmount: 31396,
      homeCurrency: 'INR',
      date: '2026-09-14',
      category: 'Accommodation',
      payerName: 'You (Aisha)',
      payerAvatar: '👩🏽',
      isShared: true,
      splitType: 'equal',
      splitWith: ['You (Aisha)', 'Ravi Sharma', 'Asha Patel'],
    },
    {
      id: 'exp_02',
      title: 'Trattoria da Luigi Dinner',
      amount: 42.0,
      currency: 'EUR',
      homeAmount: 3948,
      homeCurrency: 'INR',
      date: '2026-09-15',
      category: 'Food',
      payerName: 'Ravi Sharma',
      payerAvatar: '👨🏽',
      isShared: true,
      splitType: 'equal',
      splitWith: ['You (Aisha)', 'Ravi Sharma', 'Asha Patel'],
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
