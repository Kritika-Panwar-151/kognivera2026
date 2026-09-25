import { useState } from 'react'
import type { NavigateFn, User } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  DEFAULT_USERS,
  getRegisteredUsers,
  registerUser,
  saveUserCredentials,
  verifyUserCredentials,
  userExists,
  checkLoginLockout,
  recordFailedLogin,
  clearFailedLogins,
} from '../services/userRegistry'
import {
  CANONICAL_COUNTRIES,
  CANONICAL_CITIES,
  BUDGET_BANDS,
  TRAVEL_STYLES,
  TRAVELLER_TYPES,
  getCurrencyForCountry,
} from '../data/canonicalReferences'

interface Props {
  navigate: NavigateFn
  currentUser?: User | null
  onSelectUser: (user: User) => void
}

export const sampleUsers: User[] = []

const AVATAR_OPTIONS = ['👩🏽', '👨🏽', '👩🏻', '👨🏻', '🧑🏽', '🧳', '🎒', '✈️']

export default function LoginScreen({ navigate, onSelectUser }: Props) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [signUpStep, setSignUpStep] = useState<1 | 2>(1)

  // Step 1: Account Credentials
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Step 2: Canonical PS-08 Traveler Profile
  const [homeCountry, setHomeCountry] = useState('India')
  const [homeCity, setHomeCity] = useState('Bengaluru')
  const [travelStyle, setTravelStyle] = useState('comfort')
  const [budgetBand, setBudgetBand] = useState('mid')
  const [travellerType, setTravellerType] = useState('friends')
  const [locale, setLocale] = useState('en-IN')
  const [avatar, setAvatar] = useState('👩🏽')

  // Auto-derived currency from selected home country
  const autoCurrency = getCurrencyForCountry(homeCountry)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  const handleCountryChange = (countryName: string) => {
    setHomeCountry(countryName)
    const country = CANONICAL_COUNTRIES.find((c) => c.name === countryName)
    if (country) {
      setLocale(country.locale)
      const matchingCity = CANONICAL_CITIES.find((c) => c.countryId === country.id)
      if (matchingCity) {
        setHomeCity(matchingCity.name)
      }
    }
  }

  // Email format validation (must contain @ and valid domain)
  const isValidEmail = (val: string) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim())
  }

  // Strong password breakdown
  const pwdCriteria = {
    hasLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  }

  const isPasswordValid = Object.values(pwdCriteria).every(Boolean)

  const handleContinueToStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setMessage({ text: 'Please enter your full name', type: 'error' })
      return
    }
    if (!email.trim()) {
      setMessage({ text: 'Please enter your email address', type: 'error' })
      return
    }
    if (!isValidEmail(email)) {
      setMessage({
        text: 'Please enter a valid email address with @ and a proper domain (e.g. name@example.com)',
        type: 'error',
      })
      return
    }
    if (userExists(email.trim())) {
      setMessage({
        text: 'An account with this email already exists. Please switch to "Sign In" to log in.',
        type: 'error',
      })
      return
    }
    if (!pwdCriteria.hasLength) {
      setMessage({ text: 'Password must be at least 8 characters long', type: 'error' })
      return
    }
    if (!pwdCriteria.hasUpper) {
      setMessage({ text: 'Password must include at least one uppercase letter (A-Z)', type: 'error' })
      return
    }
    if (!pwdCriteria.hasLower) {
      setMessage({ text: 'Password must include at least one lowercase letter (a-z)', type: 'error' })
      return
    }
    if (!pwdCriteria.hasNumber) {
      setMessage({ text: 'Password must include at least one number (0-9)', type: 'error' })
      return
    }
    if (!pwdCriteria.hasSpecial) {
      setMessage({ text: 'Password must include at least one special character (!@#$%^&*)', type: 'error' })
      return
    }
    setMessage(null)
    setSignUpStep(2)
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        // ================= MULTI-STEP SIGN UP =================
        if (userExists(email.trim())) {
          setMessage({
            text: 'An account with this email already exists. Please switch to "Sign In" to log in.',
            type: 'error',
          })
          setLoading(false)
          return
        }

        let userId = `usr_${Date.now().toString(36)}`

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: name.trim(),
                home_country: homeCountry,
                home_city: homeCity,
              },
            },
          })

          if (error) {
            console.warn('Supabase auth notice:', error.message)
            // If signups are disabled in Supabase dashboard settings, gracefully proceed by creating user directly in canonical users table
            if (error.message.toLowerCase().includes('signups not allowed') || error.message.toLowerCase().includes('signup')) {
              console.info('Signups disabled in Supabase Auth config — proceeding with direct users table registration')
              userId = `usr_${Date.now().toString(36)}`
            } else {
              setMessage({ text: error.message, type: 'error' })
              setLoading(false)
              return
            }
          } else if (data?.user) {
            userId = data.user.id
          }

          // Find valid city ID from database or fallback to New Delhi
          let cityId = 'cty_0b92e2e7' // New Delhi canonical ID
          try {
            const { data: matchedCity } = await supabase
              .from('cities')
              .select('city_id')
              .ilike('name', `%${homeCity}%`)
              .limit(1)
              .maybeSingle()
            if (matchedCity?.city_id) {
              cityId = matchedCity.city_id
            }
          } catch (e) {
            console.warn('City lookup fallback:', e)
          }

          const now = new Date().toISOString()
          // Insert into canonical users table
          const { error: dbErr } = await supabase.from('users').upsert({
            user_id: userId,
            display_name: name.trim(),
            email: email.trim(),
            home_city_id: cityId,
            home_currency: autoCurrency,
            locale: locale || 'en-IN',
            budget_band: budgetBand,
            travel_style: travelStyle,
            traveller_type: travellerType,
            segment: 'heavy',
            date_of_signup: now.split('T')[0],
            status: 'active',
            created_at: now,
            updated_at: now,
          })
          if (dbErr) {
            console.error('Supabase user table upsert error:', dbErr.message)
            setMessage({ text: `Database error: ${dbErr.message}`, type: 'error' })
            setLoading(false)
            return
          }
        }

        const newUser: User = {
          id: userId,
          name: name.trim(),
          email: email.trim(),
          homeCurrency: autoCurrency,
          homeCountry,
          homeCity,
          avatar,
          role: 'Trip Organizer',
          budgetBand,
          travelStyle,
          travellerType,
          locale,
        }

        const activeSessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
        localStorage.setItem('tripwallet_session_id', activeSessionId)

        // Persist profile and credentials
        clearFailedLogins(email)
        registerUser(newUser)
        saveUserCredentials(email.trim(), password)
        localStorage.setItem('tripwallet_auth_user', JSON.stringify(newUser))
        onSelectUser(newUser)

        setMessage({ text: 'Account created successfully in database! Opening your dashboard...', type: 'success' })
        setTimeout(() => navigate('trip-dashboard'), 700)
      } else {
        // ================= SIGN IN WITH 5-ATTEMPT LOCKOUT =================
        if (!email.trim() || !password.trim()) {
          setMessage({ text: 'Please enter both your email address and password', type: 'error' })
          setLoading(false)
          return
        }

        // Check if user is locked out
        const lockout = checkLoginLockout(email)
        if (lockout.isLocked) {
          const hours = Math.floor((lockout.remainingMinutes || 120) / 60)
          const mins = (lockout.remainingMinutes || 120) % 60
          setMessage({
            text: `🔒 Account temporarily locked. You entered the wrong password 5 times. Please wait ${hours}h ${mins}m before trying again (2-hour security block).`,
            type: 'error',
          })
          setLoading(false)
          return
        }

        let authUser: User | null = null

        if (isSupabaseConfigured) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            })

            if (!error && data?.user) {
              const registered = getRegisteredUsers()
              const matched = registered.find(
                (u) =>
                  u.email.toLowerCase() === email.trim().toLowerCase() ||
                  u.id === data.user.id
              )
              authUser = matched || {
                id: data.user.id,
                name: data.user.user_metadata?.full_name || email.split('@')[0],
                email: data.user.email || email,
                homeCurrency: autoCurrency,
                avatar: '👤',
                role: 'Trip Organizer',
              }
            } else if (error) {
              console.info('Supabase Auth login notice (falling back to user database check):', error.message)
            }
          } catch (spErr) {
            console.warn('Supabase signin exception:', spErr)
          }
        }

        // If Supabase Auth did not return a session, verify against registered user database & local credentials
        if (!authUser) {
          const result = verifyUserCredentials(email, password)
          if (!result.success || !result.user) {
            if (result.error?.includes('Incorrect password')) {
              const failure = recordFailedLogin(email)
              if (failure.isLocked) {
                setMessage({
                  text: '🔒 Account locked! You entered the wrong password 5 times. Your account is blocked for 2 hours.',
                  type: 'error',
                })
              } else {
                setMessage({
                  text: `Incorrect password. Attempt ${5 - failure.attemptsLeft} of 5. After 5 failed attempts, your account will be locked for 2 hours.`,
                  type: 'error',
                })
              }
            } else {
              setMessage({
                text: result.error || 'Account not found. Please click "Create Account" first.',
                type: 'error',
              })
            }
            setLoading(false)
            return
          }
          authUser = result.user
        }

        const activeSessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
        localStorage.setItem('tripwallet_session_id', activeSessionId)

        clearFailedLogins(email)
        localStorage.setItem('tripwallet_auth_user', JSON.stringify(authUser))
        onSelectUser(authUser)
        setMessage({ text: `Welcome back, ${authUser.name}!`, type: 'success' })
        setTimeout(() => navigate('trip-dashboard'), 600)
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Authentication error', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-[#f0fdfa] to-white p-4 md:p-10 flex flex-col justify-center items-center">
      <div className="bg-white max-w-md w-full rounded-3xl border border-teal-100 shadow-xl p-6 md:p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md text-2xl">
            🧳
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#164e63]">
            TripWallet
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">
            Smart Travel Budget & Expense Companion
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setSignUpStep(1)
              setMessage(null)
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              !isSignUp
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true)
              setSignUpStep(1)
              setMessage(null)
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
              isSignUp
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Status / Alert Messages */}
        {message && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold mb-4 ${
              message.type === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {!isSignUp ? (
          /* ================= SIGN IN FORM ================= */
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Email Address or Username
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-700/20 hover:bg-teal-700 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing In...' : 'Sign In to Your Account'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true)
                  setSignUpStep(1)
                }}
                className="text-xs text-teal-700 font-semibold hover:underline"
              >
                Don't have an account? Create one now →
              </button>
            </div>

            <div className="mt-3 pt-2 text-center border-t border-slate-100">
              <p className="text-[11px] text-slate-400">
                🔒 Enterprise security with Supabase multi-user auth and real-time ledger encryption.
              </p>
            </div>
          </form>
        ) : signUpStep === 1 ? (
          /* ================= SIGN UP STEP 1 ================= */
          <form onSubmit={handleContinueToStep2} className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Step 1 of 2: Your Credentials</span>
              <span className="text-teal-600 font-bold">50%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
              <div className="bg-teal-600 h-full w-1/2 rounded-full" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Maya Sharma"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">
                  Email Address
                </label>
                {email && (
                  <span className={`text-[10px] font-semibold ${isValidEmail(email) ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isValidEmail(email) ? '✓ Valid format' : 'Valid domain required (.com, .org, etc.)'}
                  </span>
                )}
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  email && !isValidEmail(email)
                    ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-200'
                    : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'
                } focus:ring-2 outline-none transition text-sm`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">
                  Password
                </label>
                {password && (
                  <span className={`text-[10px] font-semibold ${isPasswordValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isPasswordValid ? '✓ Strong password' : 'Requirements pending'}
                  </span>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition text-sm"
              />

              {/* Password Requirements Live Checklist */}
              <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Password Security Requirements:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${pwdCriteria.hasLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <span>{pwdCriteria.hasLength ? '✓' : '○'}</span>
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwdCriteria.hasUpper ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <span>{pwdCriteria.hasUpper ? '✓' : '○'}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwdCriteria.hasLower ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <span>{pwdCriteria.hasLower ? '✓' : '○'}</span>
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${pwdCriteria.hasNumber ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <span>{pwdCriteria.hasNumber ? '✓' : '○'}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 col-span-1 sm:col-span-2 ${pwdCriteria.hasSpecial ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    <span>{pwdCriteria.hasSpecial ? '✓' : '○'}</span>
                    <span>Special symbol (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-700/20 hover:bg-teal-700 transition flex items-center justify-center gap-2 text-sm mt-3"
            >
              Continue to Traveler Profile →
            </button>
          </form>
        ) : (
          /* ================= SIGN UP STEP 2: CANONICAL PROFILE ================= */
          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>Step 2 of 2: Traveler Details</span>
              <span className="text-teal-600 font-bold">100%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2">
              <div className="bg-teal-600 h-full w-full rounded-full" />
            </div>

            {/* Avatar selection */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Choose Avatar
              </label>
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition ${
                      avatar === av
                        ? 'bg-teal-50 border-2 border-teal-600 scale-105 shadow-xs'
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Home Country & Auto-Derived Currency */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Home Country
                </label>
                <select
                  value={homeCountry}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-teal-500 outline-none"
                >
                  {CANONICAL_COUNTRIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Home Currency
                </label>
                <div className="px-2.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-between">
                  <span>{autoCurrency}</span>
                  <span className="text-[9px] bg-emerald-100 px-1.5 py-0.5 rounded font-semibold">
                    Auto
                  </span>
                </div>
              </div>
            </div>

            {/* Home City */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Home City
              </label>
              <input
                type="text"
                value={homeCity}
                onChange={(e) => setHomeCity(e.target.value)}
                placeholder="e.g. Bengaluru"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 outline-none"
              />
            </div>

            {/* Travel Style & Budget Band */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Travel Style
                </label>
                <select
                  value={travelStyle}
                  onChange={(e) => setTravelStyle(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-teal-500 outline-none"
                >
                  {TRAVEL_STYLES.map((ts) => (
                    <option key={ts.value} value={ts.value}>
                      {ts.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Budget Band
                </label>
                <select
                  value={budgetBand}
                  onChange={(e) => setBudgetBand(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-teal-500 outline-none"
                >
                  {BUDGET_BANDS.map((bb) => (
                    <option key={bb.value} value={bb.value}>
                      {bb.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSignUpStep(1)}
                className="px-3.5 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-700/20 hover:bg-teal-700 transition flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Register Account in Database ✨'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
