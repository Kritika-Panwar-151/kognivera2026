export type Screen =
  | 'login'
  | 'home'
  | 'create-trip'
  | 'trip-dashboard'
  | 'add-expense'
  | 'receipt-scanner'
  | 'ocr-confirm'
  | 'expense-history'
  | 'ai-guardian'
  | 'what-if'
  | 'group-settlement'
  | 'adaptive-itinerary'

export interface User {
  id: string
  name: string
  email: string
  homeCurrency: string
  avatar: string
  role?: string
  homeCountry?: string
  homeCity?: string
  budgetBand?: string
  travelStyle?: string
  travellerType?: string
  locale?: string
}

export interface CategoryCaps {
  accommodation: number
  transport: number
  food: number
  activities: number
  misc: number
}

export interface TripMemberInfo {
  userId: string
  role: 'owner' | 'editor' | 'viewer'
  status: 'pending' | 'active' | 'declined'
  personalBudget: number
  categoryCaps?: CategoryCaps
  invitedByUserId?: string
}

export interface Trip {
  id: string
  name: string
  destination: string
  startDate: string
  endDate: string
  currency: string
  budget: number
  spent: number
  ownerId?: string
  adults?: number
  children?: number
  partySize?: number
  members?: string[]
  memberDetails?: TripMemberInfo[]
  isGroupTrip?: boolean
  originCountry?: string
  originCity?: string
  destinationCountry?: string
  destinationCity?: string
  memberBudgets?: Record<string, number>
  personalBudget?: number
  categoryCaps?: CategoryCaps
}

export interface Expense {
  id: string
  tripId: string
  merchant: string
  amount: number
  currency: string
  convertedAmount: number
  category: string
  date: string
  paidBy: string
  isShared?: boolean
  splitBetween?: string[]
  splitType?: 'equal' | 'custom'
  splitBreakdown?: Record<string, number>
  notes?: string
  isSettled?: boolean
  homeAmount?: number
}

export interface SettlementDebt {
  from: string
  to: string
  amount: number
  currency: string
  status: 'outstanding' | 'settled'
}

export interface ItineraryItem {
  id: string
  tripId?: string
  dayIndex: number // 1-based (Day 1, Day 2...)
  time: string
  title: string
  category: 'activity' | 'meal' | 'lodging' | 'transit'
  cost: number
  currency: string
  note: string
  location?: string
  mapsUrl?: string // Universal Google Maps Search & Navigation Link
  rating?: number // Google star rating (e.g. 4.8)
  reviewCount?: number | string // Google review count (e.g. 24000 or '24k+')
  isFamous?: boolean // Top-tier famous landmark in the destination
  distance?: string // Proximity / walking distance from current location
  isLocked?: boolean // Cannot be adapted (e.g. flight, prepaid hotel)
  isAdapted?: boolean // Swapped or modified by AI
  originalTitle?: string
  originalCost?: number
  adaptationReason?: string
}

export type NavigateFn = (screen: Screen) => void

