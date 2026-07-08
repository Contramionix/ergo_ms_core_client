import { formatPageOptionLabel } from '@/core/cms/js/adminSelectOptions.js'

export function buildDefaultPolicyName({
  resourcePath,
  pages = [],
  targetType,
  role,
  roleGroup,
}) {
  if (!resourcePath) {
    return ''
  }

  const page = pages.find((item) => item.path === resourcePath)
  const pageLabel = page ? formatPageOptionLabel(page) : resourcePath

  if (targetType === 'role_group' && roleGroup) {
    return `Доступ к странице ${pageLabel} для группы ${roleGroup.name}`
  }

  if (targetType === 'role' && role) {
    return `Доступ к странице ${pageLabel} для роли ${role.name}`
  }

  return `Доступ к странице ${pageLabel}`
}
