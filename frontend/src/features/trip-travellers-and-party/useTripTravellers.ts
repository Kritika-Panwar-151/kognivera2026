import { useState } from 'react'
import type { Trip } from '../common/types'

export interface Traveller {
  id: string
  name: string
  avatar: string
  role: 'Host' | 'Adult Member' | 'Child'
  isAdult: boolean
  isIncludedInAccounts: boolean
}

export function useTripTravellers(trip?: Trip) {
  const [travellers] = useState<Traveller[]>([
    { id: 'usr_you', name: 'You (Aisha)', avatar: '👩🏽', role: 'Host', isAdult: true, isIncludedInAccounts: true },
    { id: 'usr_ravi', name: 'Ravi Sharma', avatar: '👨🏽', role: 'Adult Member', isAdult: true, isIncludedInAccounts: true },
    { id: 'usr_asha', name: 'Asha Patel', avatar: '👩🏻', role: 'Adult Member', isAdult: true, isIncludedInAccounts: true },
  ])

  const adultsCount = trip?.adults ?? travellers.filter((t) => t.isAdult).length
  const childrenCount = trip?.children ?? 0
  const totalPartySize = adultsCount + childrenCount

  return {
    travellers,
    adultsCount,
    childrenCount,
    totalPartySize,
    accountsRuleNotice: 'Group split calculations apply to adults only · Children are included as travel info',
  }
}
