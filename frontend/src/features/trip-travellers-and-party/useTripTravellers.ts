import { useMemo } from 'react'
import type { Trip } from '../common/types'
import { getRegisteredUsers } from '../../services/userRegistry'

export interface Traveller {
  id: string
  name: string
  avatar: string
  role: 'Host' | 'Adult Member' | 'Child'
  isAdult: boolean
  isIncludedInAccounts: boolean
  personalBudget?: number
  status?: 'active' | 'pending' | 'declined'
}

export function useTripTravellers(trip?: Trip) {
  const registered = getRegisteredUsers()

  const travellers = useMemo<Traveller[]>(() => {
    if (!trip || !trip.members || trip.members.length === 0) {
      return [
        { id: 'usr_you', name: 'You (Aisha)', avatar: '👩🏽', role: 'Host', isAdult: true, isIncludedInAccounts: true, personalBudget: 25000, status: 'active' },
        { id: 'usr_ravi', name: 'Ravi Sharma', avatar: '👨🏽', role: 'Adult Member', isAdult: true, isIncludedInAccounts: true, personalBudget: 20000, status: 'active' },
        { id: 'usr_asha', name: 'Asha Patel', avatar: '👩🏻', role: 'Adult Member', isAdult: true, isIncludedInAccounts: true, personalBudget: 15000, status: 'active' },
      ]
    }

    const hostId = trip.ownerId || trip.members[0]

    return trip.members.map((mId) => {
      const detail = trip.memberDetails?.find((d) => d.userId === mId)
      const u = registered.find((reg) => reg.id === mId)
      const isHost = mId === hostId
      const pBudget = detail?.personalBudget || trip.memberBudgets?.[mId] || (isHost ? trip.personalBudget || 25000 : 0)

      return {
        id: mId,
        name: u ? u.name : (isHost ? 'Admin (Host)' : mId),
        avatar: u ? u.avatar : (isHost ? '👩🏽' : '👤'),
        role: isHost ? 'Host' : 'Adult Member',
        isAdult: true,
        isIncludedInAccounts: true,
        personalBudget: pBudget,
        status: detail?.status || (isHost ? 'active' : (pBudget > 0 ? 'active' : 'pending')),
      }
    })
  }, [trip, registered])

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
