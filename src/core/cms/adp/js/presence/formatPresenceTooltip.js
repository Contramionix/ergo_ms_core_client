import { getRelativeTime } from '@/js/utils/timeUtils.js'

export function formatPresenceTooltip(isOnline, lastSeen, now) {
  if (isOnline) return 'В сети'
  if (lastSeen) {
    const relative = getRelativeTime(lastSeen, now)
    return relative ? `Был ${relative}` : 'Не в сети'
  }
  return 'Не в сети'
}
