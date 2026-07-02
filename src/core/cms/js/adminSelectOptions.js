export const POLICY_TYPE_OPTIONS = [
  { id: 'url', name: 'URL' },
  { id: 'component', name: 'Компонент' },
]

export const POLICY_ACTION_OPTIONS = [
  { id: 'allow', name: 'Разрешить' },
  { id: 'deny', name: 'Запретить' },
]

export const PAGE_ACCESS_TYPE_OPTIONS = [
  { id: 'withoutliminations', name: 'Открытая' },
  { id: 'closepage', name: 'Закрытая' },
  { id: 'withliminations', name: 'С ограничениями' },
]

export const PRESENCE_FILTER_OPTIONS = [
  { id: 'all', name: 'Все пользователи' },
  { id: 'online', name: 'В сети' },
]

export function mapRoleSelectOptions(roles = []) {
  return roles.map((role) => ({
    id: role.id,
    name: `${role.name} (${role.role_type_display})`,
  }))
}

export function mapRoleGroupSelectOptions(groups = [], { withParent = true } = {}) {
  return groups.map((group) => ({
    id: group.id,
    name: withParent ? `${group.name} · ${group.parent_role_name}` : group.name,
  }))
}

export function mapPagePathOptions(pages = []) {
  return pages.map((page) => ({
    id: page.path,
    name: page.path,
  }))
}

export function mapStringOptions(values = []) {
  return values.map((value) => ({ id: value, name: value }))
}
