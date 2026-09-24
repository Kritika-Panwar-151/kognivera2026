import { useState } from 'react'

export interface DebtItem {
  id: string
  person: string
  avatar: string
  direction: 'they_owe_you' | 'you_owe_them'
  amount: number
  currency: string
  reason: string
  isSettled: boolean
}

export function useSettlement() {
  const [debts, setDebts] = useState<DebtItem[]>([
    {
      id: 'd1',
      person: 'Asha Patel',
      avatar: '👩🏻',
      direction: 'they_owe_you',
      amount: 1000,
      currency: 'INR',
      reason: 'Equal split for Hotel Roma & dinner',
      isSettled: false,
    },
    {
      id: 'd2',
      person: 'Ravi Sharma',
      avatar: '👨🏽',
      direction: 'they_owe_you',
      amount: 1000,
      currency: 'INR',
      reason: 'Colosseum tickets & guided tour share',
      isSettled: false,
    },
    {
      id: 'd3',
      person: 'David Chen',
      avatar: '👨🏻',
      direction: 'you_owe_them',
      amount: 500,
      currency: 'INR',
      reason: 'Airport train transfer & snacks',
      isSettled: false,
    },
  ])

  const toggleSettle = (id: string) => {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, isSettled: !d.isSettled } : d)))
  }

  const theyOweYouList = debts.filter((d) => d.direction === 'they_owe_you')
  const youOweList = debts.filter((d) => d.direction === 'you_owe_them')

  const totalOwedToYou = theyOweYouList
    .filter((d) => !d.isSettled)
    .reduce((sum, d) => sum + d.amount, 0)

  const totalYouOwe = youOweList
    .filter((d) => !d.isSettled)
    .reduce((sum, d) => sum + d.amount, 0)

  const netBalance = totalOwedToYou - totalYouOwe

  return {
    debts,
    theyOweYouList,
    youOweList,
    totalOwedToYou,
    totalYouOwe,
    netBalance,
    toggleSettle,
  }
}
