import { useState, useEffect } from 'react'
import type { NavigateFn, User, Trip } from '../types'
import { getOfflineQueue, flushOfflineQueue } from '../../services/offlineQueueService'

interface Props {
  currentUser?: User
  currentTrip?: Trip
  navigate: NavigateFn
  onOpenConverter: () => void
}

export default function TopBar({
  currentUser,
  currentTrip,
  navigate,
  onOpenConverter,
}: Props) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [queueCount, setQueueCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setQueueCount(getOfflineQueue().length)

    const handleOnline = async () => {
      setIsOnline(true)
      setIsSyncing(true)
      await flushOfflineQueue()
      setQueueCount(getOfflineQueue().length)
      setIsSyncing(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    const handleQueueUpdated = (e: any) => {
      setQueueCount(e.detail?.queueLength ?? getOfflineQueue().length)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('tripwallet_queue_updated', handleQueueUpdated)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('tripwallet_queue_updated', handleQueueUpdated)
    }
  }, [])

  const handleManualSync = async () => {
    if (!isOnline || queueCount === 0 || isSyncing) return
    setIsSyncing(true)
    await flushOfflineQueue()
    setQueueCount(getOfflineQueue().length)
    setIsSyncing(false)
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-teal-100/80 px-4 py-2.5 flex items-center justify-between shadow-xs">
      {/* Brand & Active Trip */}
      <div
        onClick={() => navigate('trip-dashboard')}
        className="flex items-center gap-2.5 cursor-pointer"
      >
        <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center text-white text-base shadow-xs">
          🧳
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 text-sm leading-none">
              TripWallet
            </span>
            {currentTrip && (
              <span className="bg-teal-50 text-teal-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-teal-200/60 truncate max-w-[110px]">
                {currentTrip.name}
              </span>
            )}
          </div>
          <p className="text-[10px] text-teal-600 font-medium">Smart Travel Finance</p>
        </div>
      </div>

      {/* Right Actions: Sync Pill, FX Calculator & User Switcher */}
      <div className="flex items-center gap-2">
        {/* Network & Offline Queue Status Pill */}
        <button
          type="button"
          onClick={handleManualSync}
          className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold transition border ${
            !isOnline
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : queueCount > 0
              ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse cursor-pointer'
              : isSyncing
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
          title={
            !isOnline
              ? 'Offline mode: Changes will queue and sync when reconnected'
              : queueCount > 0
              ? `${queueCount} items in offline queue. Click to sync now.`
              : 'Connected and synchronized with Supabase'
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              !isOnline || queueCount > 0
                ? 'bg-amber-500'
                : isSyncing
                ? 'bg-blue-500 animate-spin'
                : 'bg-emerald-500'
            }`}
          />
          <span className="hidden sm:inline">
            {!isOnline
              ? queueCount > 0
                ? `Offline (${queueCount})`
                : 'Offline'
              : isSyncing
              ? 'Syncing...'
              : queueCount > 0
              ? `Sync (${queueCount})`
              : 'Live Sync'}
          </span>
        </button>

        {/* Global Currency Converter Button */}
        <button
          onClick={onOpenConverter}
          className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/70 text-teal-800 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
          title="Quick FX Calculator"
        >
          <span>💱</span>
          <span className="text-[11px]">FX</span>
        </button>

        {/* User Persona Switcher Button */}
        <button
          onClick={() => navigate('login')}
          className="flex items-center gap-1.5 p-1 hover:bg-slate-100 rounded-xl transition"
          title="Switch Traveler Account"
        >
          <div className="w-7 h-7 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-xs">
            {currentUser?.avatar || '👤'}
          </div>
        </button>
      </div>
    </header>
  )
}
