import { tGlobal } from '@/i18n/index.js'

/**
 * Группировка уведомлений по дате: Сегодня / Вчера / На этой неделе / Ранее.
 */

function startOfLocalDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfLocalWeek(date) {
  const d = startOfLocalDay(date)
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  return d
}

/**
 * @param {Array<{ id: number|string, created_at?: string }>} items
 * @returns {Array<{ key: string, label: string, items: typeof items }>}
 */
export function groupNotificationsByDate(items) {
  if (!Array.isArray(items) || items.length === 0) return []

  const now = new Date()
  const todayStart = startOfLocalDay(now)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const weekStart = startOfLocalWeek(now)

  const buckets = {
    today: { key: 'today', label: tGlobal('settings.inbox.today'), items: [] },
    yesterday: { key: 'yesterday', label: tGlobal('settings.inbox.yesterday'), items: [] },
    week: { key: 'week', label: tGlobal('settings.inbox.thisWeek'), items: [] },
    earlier: { key: 'earlier', label: tGlobal('settings.inbox.earlier'), items: [] },
  }

  for (const item of items) {
    const created = item?.created_at ? new Date(item.created_at) : null
    if (!created || Number.isNaN(created.getTime())) {
      buckets.earlier.items.push(item)
      continue
    }
    if (created >= todayStart) {
      buckets.today.items.push(item)
    } else if (created >= yesterdayStart) {
      buckets.yesterday.items.push(item)
    } else if (created >= weekStart) {
      buckets.week.items.push(item)
    } else {
      buckets.earlier.items.push(item)
    }
  }

  return Object.values(buckets).filter((group) => group.items.length > 0)
}
