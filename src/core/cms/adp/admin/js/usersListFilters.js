import { tGlobal } from '@/i18n/index.js'

export const USERS_FILTER_MAP = {
  presence: 'presence',
  role: 'role',
  joined_from: 'joinedFrom',
  joined_to: 'joinedTo',
  last_seen_from: 'lastSeenFrom',
  last_seen_to: 'lastSeenTo',
}

export function getUsersPresenceOptions() {
  return [
    { id: 'online', name: tGlobal('admin.users.presenceOnline') },
    { id: 'offline', name: tGlobal('admin.users.presenceOffline') },
  ]
}

export function getUsersFilterFields(roles = []) {
  return [
    { type: 'heading', label: tGlobal('admin.users.status') },
    {
      type: 'select',
      key: 'presence',
      label: tGlobal('admin.users.filterPresence'),
      options: getUsersPresenceOptions(),
      valueKey: 'id',
      labelKey: 'name',
      includeAllOption: true,
      allLabel: tGlobal('admin.users.presenceAll'),
    },
    {
      type: 'select',
      key: 'role',
      label: tGlobal('admin.users.colRole'),
      options: (roles || []).map((role) => ({
        id: String(role.id),
        name: role.name,
      })),
      valueKey: 'id',
      labelKey: 'name',
      includeAllOption: true,
      allLabel: tGlobal('admin.users.allRoles'),
      searchable: true,
    },
    { type: 'heading', label: tGlobal('admin.users.colRegistered') },
    { type: 'date', key: 'joinedFrom', label: tGlobal('admin.users.dateFrom') },
    { type: 'date', key: 'joinedTo', label: tGlobal('admin.users.dateTo') },
    { type: 'heading', label: tGlobal('admin.users.colLastActive') },
    { type: 'date', key: 'lastSeenFrom', label: tGlobal('admin.users.dateFrom') },
    { type: 'date', key: 'lastSeenTo', label: tGlobal('admin.users.dateTo') },
  ]
}

function resolveFilterDisplayValue(field, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return ''
  if (field.type === 'date') return String(rawValue)
  if (field.type === 'select') {
    const valueKey = field.valueKey || 'value'
    const labelKey = field.labelKey || 'label'
    const found = (field.options || []).find((opt) => {
      const value = typeof opt === 'object' && opt !== null ? opt[valueKey] : opt
      return String(value) === String(rawValue)
    })
    if (found && typeof found === 'object') return found[labelKey] ?? String(rawValue)
    if (found != null) return String(found)
    return String(rawValue)
  }
  return String(rawValue)
}

export function buildUsersFiltersTooltip(fields, filters) {
  const parts = []
  for (const field of fields) {
    if (field.type === 'heading') continue
    const display = resolveFilterDisplayValue(field, filters[field.key])
    if (display) parts.push(display)
  }
  return parts.join(', ')
}

export function buildAdminUsersQueryParams(listState, pageSize) {
  const params = {
    page: listState.page,
    page_size: pageSize,
  }
  const q = (listState.q || '').trim()
  if (q) params.q = q
  if (listState.letter) params.letter = listState.letter
  if (listState.presence === 'online' || listState.presence === 'offline') {
    params.presence = listState.presence
  }
  if (listState.role) params.role = listState.role
  if (listState.joined_from) params.joined_from = listState.joined_from
  if (listState.joined_to) params.joined_to = listState.joined_to
  if (listState.last_seen_from) params.last_seen_from = listState.last_seen_from
  if (listState.last_seen_to) params.last_seen_to = listState.last_seen_to
  return params
}
