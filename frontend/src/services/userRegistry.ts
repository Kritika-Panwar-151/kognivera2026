import type { User } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export const DEFAULT_USERS: User[] = []

const LOCAL_STORAGE_KEY = 'tripwallet_registered_users'

// In-memory live cache of registered users
let liveUsersCache: User[] = []
const userListeners: Set<(users: User[]) => void> = new Set()

export function getRegisteredUsers(): User[] {
  if (liveUsersCache.length > 0) {
    return liveUsersCache
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const stored: User[] = JSON.parse(raw)
      liveUsersCache = stored
      return stored
    }
  } catch (e) {
    console.warn('Error reading stored users:', e)
  }
  return []
}

/**
 * Resolves any user ID, UUID, or identifier to a human-readable display name.
 */
export function resolveMemberName(idOrName: string, registeredUsers?: User[], currentUserId?: string): string {
  if (!idOrName) return 'Member'
  const clean = idOrName.trim()
  if (currentUserId && (clean === currentUserId || clean === 'usr_you')) return 'You'

  const users = registeredUsers && registeredUsers.length > 0 ? registeredUsers : getRegisteredUsers()
  const found = users.find(
    (u) =>
      u.id === clean ||
      (u as any).user_id === clean ||
      u.name.toLowerCase() === clean.toLowerCase() ||
      u.email.toLowerCase() === clean.toLowerCase() ||
      isUserMatch(clean, u)
  )
  if (found) {
    if (found.name.toLowerCase().startsWith('user') && !found.name.includes(' ')) {
      const num = found.name.replace(/^user/i, '')
      if (num) return `User ${num}`
    }
    return found.name
  }

  if (clean === 'usr_you' || clean.toLowerCase() === 'you') return 'You'

  // Format "usr_19", "User19", "usr_000000000019" -> "User 19"
  if (clean.toLowerCase().startsWith('usr_') || clean.toLowerCase().startsWith('user')) {
    const rawNumber = clean.replace(/^(usr_|user_?)/i, '').replace(/^0+/g, '')
    if (rawNumber) return `User ${rawNumber}`
  }

  // Format UUID gracefully
  if (clean.length > 20 && clean.includes('-')) {
    return `User (${clean.slice(0, 6)})`
  }
  return clean
}

/**
 * Robustly checks if a given member string matches the target user.
 */
export function isUserMatch(memberIdOrName: string | undefined, user: Partial<User> | null | undefined): boolean {
  if (!memberIdOrName || !user) return false
  const target = memberIdOrName.toLowerCase().replace(/\s+/g, '').trim()
  const uid = (user.id || '').toLowerCase().replace(/\s+/g, '').trim()
  const uname = (user.name || '').toLowerCase().replace(/\s+/g, '').trim()

  if (target === uid || target === uname) return true
  if (target === 'usr_you' || target === 'you') return true

  // Compare numerical suffixes e.g. usr_000000000019 -> 19 vs User19 -> 19
  const targetNum = target.replace(/^(usr_|user_?)/i, '').replace(/^0+/g, '')
  const uidNum = uid.replace(/^(usr_|user_?)/i, '').replace(/^0+/g, '')
  const unameNum = uname.replace(/^(usr_|user_?)/i, '').replace(/^0+/g, '')

  if (targetNum && (targetNum === uidNum || targetNum === unameNum)) return true
  if (uid.includes(target) || target.includes(uid) || uname.includes(target) || target.includes(uname)) return true

  return false
}

/**
 * Subscribes to live user updates across all simultaneous devices & browser tabs.
 */
export function subscribeToLiveUsers(listener: (users: User[]) => void): () => void {
  userListeners.add(listener)
  const current = getRegisteredUsers()
  listener(current)

  // Asynchronously sync from Supabase database to guarantee latest additions
  fetchUsersFromSupabase().then(listener)

  return () => {
    userListeners.delete(listener)
  }
}

function notifyUserListeners(users: User[]) {
  userListeners.forEach((fn) => {
    try {
      fn(users)
    } catch (err) {
      console.warn('User listener error:', err)
    }
  })
}

/**
 * Fetches all registered users live from Supabase users table (shared across all team laptops).
 */
export async function fetchUsersFromSupabase(): Promise<User[]> {
  const local = getRegisteredUsers()
  if (!isSupabaseConfigured) return local

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) return local

    const dbUsers: User[] = data.map((r: any) => ({
      id: r.user_id,
      name: r.display_name || r.name || 'Traveler',
      email: r.email,
      homeCurrency: r.home_currency || 'INR',
      homeCountry: r.home_country || 'India',
      homeCity: r.home_city_id || '',
      avatar: r.avatar || '👤',
      role: r.travel_style ? `${r.travel_style} traveler` : 'Co-traveler',
      budgetBand: r.budget_band || 'mid',
      travelStyle: r.travel_style || 'comfort',
      travellerType: r.traveller_type || 'friends',
      locale: r.locale || 'en-IN',
    }))

    // Merge database users with default/local users
    const idMap = new Map<string, User>()
    DEFAULT_USERS.forEach((u) => idMap.set(u.id, u))
    local.forEach((u) => idMap.set(u.id, u))
    dbUsers.forEach((u) => idMap.set(u.id, u))

    const merged = Array.from(idMap.values())
    liveUsersCache = merged

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged))
    } catch {}

    notifyUserListeners(merged)
    return merged
  } catch (e) {
    console.warn('Live user fetch fallback:', e)
    return local
  }
}

// Initialize Realtime Supabase Channel
if (typeof window !== 'undefined' && isSupabaseConfigured) {
  fetchUsersFromSupabase()

  // Realtime subscription: When ANY user registers on ANY machine, update instantly!
  supabase
    .channel('realtime_all_users_channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
      console.log('⚡ Realtime: New user registered on another machine! Updating user lists...', payload)
      fetchUsersFromSupabase()
    })
    .subscribe()
}

export function registerUser(newUser: User): User[] {
  const users = getRegisteredUsers()
  const exists = users.findIndex(
    (u) => u.id === newUser.id || u.email.toLowerCase() === newUser.email.toLowerCase()
  )
  let updated: User[]
  if (exists >= 0) {
    updated = [...users]
    updated[exists] = { ...updated[exists], ...newUser }
  } else {
    updated = [newUser, ...users]
  }

  liveUsersCache = updated

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Error saving user to localStorage:', e)
  }

  notifyUserListeners(updated)

  // Also sync to Supabase if configured
  if (isSupabaseConfigured) {
    supabase
      .from('users')
      .upsert({
        user_id: newUser.id,
        display_name: newUser.name,
        email: newUser.email,
        home_city_id: newUser.homeCity || 'cty_001',
        home_currency: (newUser.homeCurrency || 'INR').split(' ')[0],
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

const DEFAULT_PASSWORDS: Record<string, string> = {}

export function getStoredCredentials(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    console.warn('Error reading stored credentials:', e)
  }
  return {}
}

export function saveUserCredentials(email: string, passwordHash: string): void {
  const current = getStoredCredentials()
  current[email.toLowerCase()] = passwordHash
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(current))
  } catch (e) {
    console.warn('Error saving credentials:', e)
  }
}

export function userExists(email: string): boolean {
  const users = getRegisteredUsers()
  return users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
}

export const verifyUserCredentials = authenticateStoredUser

export function authenticateStoredUser(
  emailOrName: string,
  password: string
): { success: boolean; user?: User; error?: string } {
  const users = getRegisteredUsers()
  const query = emailOrName.trim().toLowerCase()

  if (!query) {
    return {
      success: false,
      error: 'Please enter your email address or username.',
    }
  }

  const matchedUser = users.find(
    (u) =>
      u.email.toLowerCase() === query ||
      u.name.toLowerCase() === query ||
      u.name.toLowerCase().split(' ')[0] === query ||
      u.id.toLowerCase() === query
  )

  if (!matchedUser) {
    return {
      success: false,
      error: 'Account not found. Please click "Create Account" to register first.',
    }
  }

  const creds = getStoredCredentials()
  const storedPassword = creds[matchedUser.email.toLowerCase()]

  if (storedPassword && storedPassword !== password.trim()) {
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
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.homeCountry && u.homeCountry.toLowerCase().includes(q)) ||
      (u.homeCity && u.homeCity.toLowerCase().includes(q))
  )
}

// ================= 5 FAILED ATTEMPTS / 2-HOUR LOCKOUT =================
const LOGIN_ATTEMPTS_KEY = 'tripwallet_login_attempts'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 2 * 60 * 60 * 1000 // 2 hours in ms

export interface LockoutStatus {
  isLocked: boolean
  remainingMinutes?: number
  attemptsLeft?: number
}

export function checkLoginLockout(email: string): LockoutStatus {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY)
    if (!raw) return { isLocked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS }

    const records: Record<string, { count: number; lockedUntil?: number }> = JSON.parse(raw)
    const record = records[email.trim().toLowerCase()]

    if (!record) return { isLocked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS }

    if (record.lockedUntil && record.lockedUntil > Date.now()) {
      const remainingMs = record.lockedUntil - Date.now()
      const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
      return { isLocked: true, remainingMinutes, attemptsLeft: 0 }
    }

    if (record.lockedUntil && record.lockedUntil <= Date.now()) {
      delete records[email.trim().toLowerCase()]
      localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(records))
      return { isLocked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS }
    }

    return {
      isLocked: false,
      attemptsLeft: Math.max(0, MAX_LOGIN_ATTEMPTS - (record.count || 0)),
    }
  } catch {
    return { isLocked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS }
  }
}

export function recordFailedLogin(
  email: string
): { isLocked: boolean; remainingMinutes?: number; attemptsLeft: number } {
  try {
    const key = email.trim().toLowerCase()
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY)
    const records: Record<string, { count: number; lockedUntil?: number }> = raw
      ? JSON.parse(raw)
      : {}
    const existing = records[key] || { count: 0 }
    existing.count = (existing.count || 0) + 1

    if (existing.count >= MAX_LOGIN_ATTEMPTS) {
      existing.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
      records[key] = existing
      localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(records))
      return { isLocked: true, remainingMinutes: 120, attemptsLeft: 0 }
    }

    records[key] = existing
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(records))
    return { isLocked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS - existing.count }
  } catch {
    return { isLocked: false, attemptsLeft: 4 }
  }
}

export function clearFailedLogins(email: string): void {
  try {
    const key = email.trim().toLowerCase()
    const raw = localStorage.getItem(LOGIN_ATTEMPTS_KEY)
    if (!raw) return
    const records = JSON.parse(raw)
    delete records[key]
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(records))
  } catch {}
}
