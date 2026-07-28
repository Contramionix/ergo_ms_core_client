import { clientEnv } from '@/js/clientEnv.js'
import { getSessionClaim } from '@/core/cms/js/tokenStorage.js'
import { getSessionScopeGatingClaims } from '@/integrations/sessionScopeGating.js'

const STORAGE_KEY = 'ergo_client_monitor_sid'
const SEQ_KEY = 'ergo_client_monitor_seq'

function canUseStorage() {
  return typeof sessionStorage !== 'undefined'
}

export function isMonitoringEnabled() {
  return Boolean(clientEnv.monitoringEnabled)
}

export function getOrCreateMonitorSessionId() {
  if (!canUseStorage()) {
    return crypto.randomUUID()
  }
  let sid = sessionStorage.getItem(STORAGE_KEY)
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem(STORAGE_KEY, sid)
  }
  return sid
}

export function resetMonitorSession() {
  if (!canUseStorage()) {
    return
  }
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(SEQ_KEY)
}

export function nextMonitorSeq() {
  if (!canUseStorage()) {
    return Date.now()
  }
  const current = Number.parseInt(sessionStorage.getItem(SEQ_KEY) || '0', 10)
  const next = Number.isFinite(current) && current > 0 ? current + 1 : 1
  sessionStorage.setItem(SEQ_KEY, String(next))
  return next
}

export function buildSessionMeta() {
  const claimKeys = getSessionScopeGatingClaims().filter((name) => getSessionClaim(name) != null)
  const viewport =
    typeof window !== 'undefined'
      ? `${window.innerWidth || 0}x${window.innerHeight || 0}`
      : ''
  let timezone = ''
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    timezone = ''
  }
  return {
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
    language: typeof navigator !== 'undefined' ? navigator.language || '' : '',
    timezone,
    viewport,
    client_version: clientEnv.systemVersion || '',
    scope_claim_keys: claimKeys,
  }
}
