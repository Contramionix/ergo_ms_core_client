import { createClientUuid } from '@/js/createClientUuid.js'

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

export function buildClientEnvelope(type, payload, topic = '') {
  return {
    v: ENVELOPE_VERSION,
    id: createClientUuid(),
    topic,
    type,
    payload,
    ts: new Date().toISOString(),
  }
}
