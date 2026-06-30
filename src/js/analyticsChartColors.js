/** Палитра групп/серий для графиков модулей видеоаналитики (CSS vars — темо-адаптивно). */
export const ANALYTICS_GROUP_COLORS = [
  'var(--bs-primary, var(--ui-accent))',
  'var(--bs-success)',
  'var(--bs-warning)',
  'var(--bs-danger)',
  'var(--bs-info)',
  'var(--bs-secondary, var(--ui-text-muted))',
  'var(--ui-accent)',
  'var(--bs-teal, #20c997)',
]

export function getAnalyticsGroupColor(index) {
  const i = Number(index) || 0
  return ANALYTICS_GROUP_COLORS[((i % ANALYTICS_GROUP_COLORS.length) + ANALYTICS_GROUP_COLORS.length) % ANALYTICS_GROUP_COLORS.length]
}
