import type { User } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr_aisha',
    name: 'Aisha Rossi',
    email: 'aisha.rossi@example.invalid',
    homeCurrency: 'INR',
    homeCountry: 'India',
    homeCity: 'Bengaluru',
    avatar: '👩🏽',
    role: 'Trip Organizer / Owner',
    budgetBand: 'mid',
    travelStyle: 'cultural',
    travellerType: 'friends',
    locale: 'en-IN',
  },
  {
    id: 'usr_ravi',
    name: 'Ravi Sharma',
    email: 'ravi.sharma@example.invalid',
    homeCurrency: 'INR',
    homeCountry: 'India',
    homeCity: 'New Delhi',
    avatar: '👨🏽',
    role: 'Editor / Co-traveler',
    budgetBand: 'value',
    travelStyle: 'comfort',
    travellerType: 'friends',
    locale: 'hi',
  },
  {
    id: 'usr_pooja',
    name: 'Pooja Tanaka',
    email: 'pooja.tanaka@example.invalid',
    homeCurrency: 'INR',
    homeCountry: 'India',
    homeCity: 'Mumbai',
    avatar: '👩🏻',
    role: 'Viewer / Co-traveler',
    budgetBand: 'shoestring',
    travelStyle: 'budget',
    travellerType: 'friends',
    locale: 'en-IN',
  },
  {
    id: 'usr_david',
    name: 'David Chen',
    email: 'david.chen@example.invalid',
    homeCurrency: 'USD',
    homeCountry: 'United States',
    homeCity: 'New York',
    avatar: '👨🏻',
    role: 'Editor / Co-traveler',
    budgetBand: 'premium',
    travelStyle: 'adventure',
    travellerType: 'friends',
    locale: 'en-US',
  },
  {
    id: 'usr_elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@example.invalid',
    homeCurrency: 'EUR',
    homeCountry: 'France',
    homeCity: 'Paris',
    avatar: '👩🏼',
    role: 'Viewer / Co-traveler',
    budgetBand: 'luxury',
    travelStyle: 'luxury',
    travellerType: 'couple',
    locale: 'fr-FR',
  },
]

const LOCAL_STORAGE_KEY = 'tripwallet_registered_users'

export function getRegisteredUsers(): User[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const stored: User[] = JSON.parse(raw)
      // Merge with default users avoiding duplicates
      const ids = new Set(stored.map((u) => u.id))
      const combined = [...stored]
      for (const d of DEFAULT_USERS) {
        if (!ids.has(d.id)) {
          combined.push(d)
        }
      }
      return combined
    }
  } catch (e) {
    console.warn('Error reading stored users:', e)
  }
  return DEFAULT_USERS
}

export function registerUser(newUser: User): User[] {
  const users = getRegisteredUsers()
  const exists = users.findIndex((u) => u.id === newUser.id || u.email.toLowerCase() === newUser.email.toLowerCase())
  let updated: User[]
  if (exists >= 0) {
    updated = [...users]
    updated[exists] = { ...updated[exists], ...newUser }
  } else {
    updated = [newUser, ...users]
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Error saving user to localStorage:', e)
  }

  // Also sync to Supabase if configured
  if (isSupabaseConfigured) {
    supabase
      .from('users')
      .upsert({
        user_id: newUser.id,
        display_name: newUser.name,
        email: newUser.email,
        home_city_id: 'cty_001',
        home_currency: newUser.homeCurrency.split(' ')[0],
        locale: newUser.locale || 'en-IN',
        budget_band: newUser.budgetBand || 'mid',
        travel_style: newUser.travelStyle || 'comfort',
        traveller_type: newUser.travellerType || 'friends',
        segment: 'heavy',
        date_of_signup: new Date().toISOString().split('T')[0],
        status: 'active',
      })
      .then(({ error }) => {
        if (error) console.error('Supabase user sync error:', error.message)
      })
  }

  return updated
}

const CREDENTIALS_KEY = 'tripwallet_user_credentials'

// Canonical seed passwords for default users
const DEFAULT_PASSWORDS: Record<string, string> = {
  'aisha.rossi@example.invalid': 'TripWallet@2026',
  'ravi.sharma@example.invalid': 'TripWallet@2026',
  'pooja.tanaka@example.invalid': 'TripWallet@2026',
  'david.chen@example.invalid': 'TripWallet@2026',
  'elena.rostova@example.invalid': 'TripWallet@2026',
}

export function getStoredCredentials(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY)
    if (raw) {
      return { ...DEFAULT_PASSWORDS, ...JSON.parse(raw) }
    }
  } catch (e) {
    console.warn('Error reading credentials:', e)
  }
  return { ...DEFAULT_PASSWORDS }
}

export function saveUserCredentials(email: string, password: string): void {
  try {
    const creds = getStoredCredentials()
    creds[email.trim().toLowerCase()] = password
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds))
  } catch (e) {
    console.warn('Error saving credentials:', e)
  }
}

export function userExists(emailOrUsername: string): boolean {
  const q = emailOrUsername.trim().toLowerCase()
  const users = getRegisteredUsers()
  return users.some(
    (u) =>
      u.email.toLowerCase() === q ||
      u.name.toLowerCase() === q ||
      u.id.toLowerCase() === q
  )
}

export function verifyUserCredentials(
  emailOrUsername: string,
  password: string
): { success: boolean; user?: User; error?: string } {
  const q = emailOrUsername.trim().toLowerCase()
  const users = getRegisteredUsers()

  const matchedUser = users.find(
    (u) =>
      u.email.toLowerCase() === q ||
      u.name.toLowerCase() === q ||
      u.id.toLowerCase() === q
  )

  if (!matchedUser) {
    return {
      success: false,
      error: 'Account not found. Please click "Create Account" to register first.',
    }
  }

  const creds = getStoredCredentials()
  const storedPassword = creds[matchedUser.email.toLowerCase()]

  if (storedPassword && storedPassword !== password) {
    return {
      success: false,
      error: 'Incorrect password. Please enter the password you registered with.',
    }
  }

  return {
    success: true,
    user: matchedUser,
  }
}

export function searchUsers(query: string): User[] {
  const q = query.trim().toLowerCase()
  const users = getRegisteredUsers()
  if (!q) return users
  return users.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.homeCountry && u.homeCountry.toLowerCase().includes(q))
  )
}

