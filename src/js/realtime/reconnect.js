/** Общие параметры переподключения realtime-транспортов. */
export const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000]
export const MAX_RECONNECT_ATTEMPTS = 12

export function reconnectDelayMs(attempt) {
  return RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)]
}
