/**
 * Offline Action Queue and Connectivity Synchronizer for TripWallet
 * Guarantees zero data loss when roaming without network access.
 */
import { saveExpenseToSupabase, deleteExpenseFromSupabase, updateExpenseInSupabase } from './supabaseDataService'

export interface QueuedAction {
  id: string
  type: 'SAVE_EXPENSE' | 'DELETE_EXPENSE' | 'UPDATE_EXPENSE'
  payload: any
  timestamp: string
}

const STORAGE_KEY = 'tripwallet_offline_actions_queue'

export function getOfflineQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveOfflineQueue(queue: QueuedAction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch (e) {
    console.warn('Failed to save offline queue to localStorage:', e)
  }
}

export function enqueueOfflineAction(type: QueuedAction['type'], payload: any): void {
  const queue = getOfflineQueue()
  const newAction: QueuedAction = {
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
  }
  queue.push(newAction)
  saveOfflineQueue(queue)
  window.dispatchEvent(new CustomEvent('tripwallet_queue_updated', { detail: { queueLength: queue.length } }))
}

export async function flushOfflineQueue(
  onProgress?: (remaining: number) => void
): Promise<{ flushedCount: number }> {
  const queue = getOfflineQueue()
  if (queue.length === 0) return { flushedCount: 0 }

  let flushedCount = 0

  while (queue.length > 0) {
    const action = queue[0]
    try {
      if (action.type === 'SAVE_EXPENSE') {
        await saveExpenseToSupabase(action.payload.expense, action.payload.payerUserId)
      } else if (action.type === 'DELETE_EXPENSE') {
        await deleteExpenseFromSupabase(action.payload.expenseId)
      } else if (action.type === 'UPDATE_EXPENSE') {
        await updateExpenseInSupabase(action.payload.expenseId, action.payload.updates)
      }
      queue.shift()
      saveOfflineQueue(queue)
      flushedCount++
      if (onProgress) onProgress(queue.length)
    } catch (e) {
      console.warn('Could not flush action, staying in queue:', e)
      break
    }
  }

  window.dispatchEvent(new CustomEvent('tripwallet_queue_updated', { detail: { queueLength: queue.length } }))
  return { flushedCount }
}
