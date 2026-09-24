/**
 * LLM Session Tracker & Distributed Tracing Engine (PS-08)
 * 
 * Automatically manages:
 * - session_id: Persistent session tracking per browser lifecycle
 * - trace_id: Unique correlation trace ID per LLM call / user action
 * - Automated background logging to Supabase audit_logs & in-memory buffer
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface TraceRecord {
  logId: string
  traceId: string
  sessionId: string
  userId?: string
  accountId?: string
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, any>
  createdAt: string
  latencyMs?: number
  llmVerified?: boolean
}

const SESSION_STORAGE_KEY = 'tripwallet_llm_session_id'
const IN_MEMORY_TRACES_KEY = 'tripwallet_recent_traces'

// 1. Get or generate active Session ID
export function getActiveSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!sid) {
      sid = `ses_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
      sessionStorage.setItem(SESSION_STORAGE_KEY, sid)
    }
    return sid
  } catch {
    return `ses_${Date.now().toString(36)}`
  }
}

// 2. Generate a new Trace ID for an individual operation
export function generateTraceId(): string {
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`
}

// 3. In-memory buffer of recent traces for live session audit inspection
export function getRecentTraces(): TraceRecord[] {
  try {
    const raw = sessionStorage.getItem(IN_MEMORY_TRACES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function pushToLocalTraces(record: TraceRecord) {
  try {
    const traces = getRecentTraces()
    traces.unshift(record)
    // Keep last 50 traces
    if (traces.length > 50) traces.length = 50
    sessionStorage.setItem(IN_MEMORY_TRACES_KEY, JSON.stringify(traces))
  } catch (e) {
    console.warn('Trace buffer error:', e)
  }
}

// 4. Automated Trace Logger (Writes to Supabase audit_logs in background)
export async function recordTrace(params: {
  traceId?: string
  action: string
  userId?: string
  accountId?: string
  entityType?: string
  entityId?: string
  details?: Record<string, any>
  latencyMs?: number
  llmVerified?: boolean
}): Promise<TraceRecord> {
  const sessionId = getActiveSessionId()
  const traceId = params.traceId || generateTraceId()
  const now = new Date().toISOString()
  const logId = `log_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`

  const record: TraceRecord = {
    logId,
    traceId,
    sessionId,
    userId: params.userId,
    accountId: params.accountId || (params.userId ? `acc_${params.userId.replace('usr_', '')}` : undefined),
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details || {},
    createdAt: now,
    latencyMs: params.latencyMs,
    llmVerified: params.llmVerified ?? true,
  }

  // Push to local buffer for live UI inspector
  pushToLocalTraces(record)

  // Fire-and-forget write to Supabase audit_logs
  if (isSupabaseConfigured) {
    supabase
      .from('audit_logs')
      .insert({
        log_id: record.logId,
        trace_id: record.traceId,
        session_id: record.sessionId,
        account_id: record.accountId,
        user_id: record.userId,
        action: record.action,
        entity_type: record.entityType,
        entity_id: record.entityId,
        details: {
          ...record.details,
          latency_ms: record.latencyMs,
          llm_verified: record.llmVerified,
        },
        created_at: now,
      })
      .then(({ error }) => {
        if (error) {
          // Non-blocking: trace is still preserved in local memory
          console.debug('Background audit log notice:', error.message)
        }
      })
  }

  return record
}
