import { formatPageOptionLabel } from '@/core/cms/js/adminSelectOptions.js'
import { tGlobal } from '@/i18n/index.js'

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
    return tGlobal('admin.policies.autoNamePageGroup', { page: pageLabel, group: roleGroup.name })
  }

  if (targetType === 'role' && role) {
    return tGlobal('admin.policies.autoNamePageRole', { page: pageLabel, role: role.name })
  }

  return tGlobal('admin.policies.autoNamePage', { page: pageLabel })
}
