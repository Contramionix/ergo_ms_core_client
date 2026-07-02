const DEFAULT_INTERVALS_MS = {
  presence: 45000,
  notifications: 15000,
  adminPresence: 10000,
  messenger: 5000,
}

const ENV_INTERVAL_KEYS = {
  presence: 'VITE_REALTIME_POLL_PRESENCE_INTERVAL',
  notifications: 'VITE_REALTIME_POLL_NOTIFICATIONS_INTERVAL',
  adminPresence: 'VITE_REALTIME_POLL_ADMIN_PRESENCE_INTERVAL',
  messenger: 'VITE_REALTIME_POLL_MESSENGER_INTERVAL',
}

/**
 * @returns {'websocket' | 'http_polling'}
 */
export function getRealtimeTransport() {
  const mode = String(import.meta.env.VITE_REALTIME_TRANSPORT || 'websocket').trim().toLowerCase()
  return mode === 'http_polling' ? 'http_polling' : 'websocket'
}

export function isHttpPollingMode() {
  return getRealtimeTransport() === 'http_polling'
}

/**
 * @param {'presence' | 'notifications' | 'adminPresence' | 'messenger'} channel
 */
export function pollIntervalMs(channel) {
  const envKey = ENV_INTERVAL_KEYS[channel]
  const raw = envKey ? import.meta.env[envKey] : undefined
  const parsed = Number.parseInt(String(raw ?? ''), 10)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }
  return DEFAULT_INTERVALS_MS[channel] ?? 15000
}
