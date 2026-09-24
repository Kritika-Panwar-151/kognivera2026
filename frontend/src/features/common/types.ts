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

export interface Trip {
  id: string
  name: string
  destination: string
  startDate: string
  endDate: string
  currency: string
  budget: number
  spent: number
  adults?: number
  children?: number
  partySize?: number
  members?: string[]
  isGroupTrip?: boolean
  originCountry?: string
  originCity?: string
  destinationCountry?: string
  destinationCity?: string
  memberBudgets?: Record<string, number>
  personalBudget?: number
  categoryCaps?: {
    accommodation: number
    transport: number
    food: number
    activities: number
    misc: number
  }
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
  notes?: string
}

export interface SettlementDebt {
  from: string
  to: string
  amount: number
  currency: string
  status: 'outstanding' | 'settled'
}

export type NavigateFn = (screen: Screen) => void

