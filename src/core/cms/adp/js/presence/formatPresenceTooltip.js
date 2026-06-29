import { getRelativeTime } from '@/js/utils/timeUtils.js'

export function formatPresenceTooltip(isOnline, lastSeen) {
  if (isOnline) return 'В сети'
  if (lastSeen) {
    const relative = getRelativeTime(lastSeen)
    return relative ? `Был ${relative}` : 'Не в сети'
  }
  return 'Не в сети'
}
