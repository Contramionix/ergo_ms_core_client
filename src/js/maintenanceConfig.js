/** Интервал опроса maintenance.json (мс). Дублируется в maintenance_mode.py для JSON. */
export const MAINTENANCE_POLL_INTERVAL_MS = 3000

export const MAINTENANCE_POLL_INTERVAL_MIN_MS = 1000
export const MAINTENANCE_POLL_INTERVAL_MAX_MS = 60000

export function normalizeMaintenancePollIntervalMs(value, fallback = MAINTENANCE_POLL_INTERVAL_MS) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  if (parsed < MAINTENANCE_POLL_INTERVAL_MIN_MS || parsed > MAINTENANCE_POLL_INTERVAL_MAX_MS) {
    return fallback
  }
  return parsed
}
