const ENVELOPE_VERSION = 1

export const WS_CONTROL_TOPIC = 'ws:control'
export const WS_AUTH_EVENT = 'ws_auth'
export const WS_AUTH_OK_EVENT = 'ws_auth_ok'
export const PRESENCE_PING_EVENT = 'presence_ping'
export const PRESENCE_USER_TOPIC = 'presence:user'

export function isRealtimeEnvelope(data) {
  return Boolean(
    data
    && typeof data === 'object'
    && data.v === ENVELOPE_VERSION
    && typeof data.type === 'string'
    && Object.prototype.hasOwnProperty.call(data, 'payload'),
  )
}

/**
 * id envelope — не секрет. randomUUID() только в secure context (https/localhost);
 * getRandomValues доступен и на http://LAN-IP.
 */
function createEnvelopeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  throw new Error('Web Crypto API недоступен: нельзя создать id envelope')
}

export function buildClientEnvelope(type, payload, topic = '') {
  return {
    v: ENVELOPE_VERSION,
    id: createEnvelopeId(),
    topic,
    type,
    payload,
    ts: new Date().toISOString(),
  }
}
