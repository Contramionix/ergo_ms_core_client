import { getCurrentBcp47, tGlobal } from '@/i18n/index.js'

export function getPolicyTypeOptions() {
  return [
    { id: 'url', name: tGlobal('admin.policies.typeUrl') },
    { id: 'component', name: tGlobal('admin.policies.typeComponent') },
  ]
}

export function getPolicyActionOptions() {
  return [
    { id: 'allow', name: tGlobal('admin.policies.allow') },
    { id: 'deny', name: tGlobal('admin.policies.deny') },
  ]
}

export function getPolicyTargetTypeOptions() {
  return [
    { id: 'role_group', name: tGlobal('admin.policies.targetGroup') },
    { id: 'role', name: tGlobal('admin.policies.targetRole') },
  ]
}

export function getPolicyPathModeOptions() {
  return [
    { id: 'page', name: tGlobal('admin.policies.page') },
    { id: 'pattern', name: tGlobal('admin.policies.pattern') },
  ]
}

export function getPresenceFilterOptions() {
  return [
    { id: 'all', name: tGlobal('admin.users.presenceAll') },
    { id: 'online', name: tGlobal('admin.users.presenceOnline') },
  ]
}

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

export function formatPageOptionLabel(page) {
  const title = (page?.title || page?.name || '').trim()
  const path = page?.path || ''
  if (title && title !== path) {
    return `${title} · ${path}`
  }
  return path
}

export function mapPagePathOptions(pages = []) {
  return pages.map((page) => ({
    id: page.path,
    name: formatPageOptionLabel(page),
    module: page.module_name || page.module || 'core',
  }))
}

export function formatModuleLabel(moduleName, moduleCatalog = []) {
  const key = !moduleName || moduleName === 'cms' ? 'core' : moduleName

  if (key === 'core') {
    return tGlobal('admin.policies.coreModule')
  }

  const catalogEntry = moduleCatalog.find((item) => item.module_name === key)
  if (catalogEntry?.module_label) {
    const label = String(catalogEntry.module_label).trim()
    if (label && label.toUpperCase() !== 'CMS') {
      return label
    }
  }

  return key
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function resolvePageModuleKey(moduleName) {
  const key = moduleName || 'core'
  return key === 'cms' ? 'core' : key
}

export function buildModulePageGroups(pages = [], moduleCatalog = []) {
  const groups = new Map()
  const locale = getCurrentBcp47()

  for (const module of moduleCatalog) {
    if (!module?.module_name) {
      continue
    }
    const key = resolvePageModuleKey(module.module_name)
    if (groups.has(key)) {
      continue
    }
    groups.set(key, {
      key,
      label: formatModuleLabel(key, moduleCatalog),
      pages: [],
    })
  }

  for (const page of pages) {
    const moduleKey = resolvePageModuleKey(page.module_name || page.module)
    if (!groups.has(moduleKey)) {
      groups.set(moduleKey, {
        key: moduleKey,
        label: formatModuleLabel(moduleKey, moduleCatalog),
        pages: [],
      })
    }

    groups.get(moduleKey).pages.push({
      path: page.path,
      title: (page.title || '').trim(),
      label: formatPageOptionLabel(page),
    })
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      pages: group.pages.sort((left, right) => left.label.localeCompare(right.label, locale)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, locale))
}

export function mapModuleSelectOptions(pages = [], moduleCatalog = []) {
  return buildModulePageGroups(pages, moduleCatalog).map((group) => ({
    id: group.key,
    name: `${group.label} (${group.pages.length})`,
  }))
}

export function mapModuleCatalogSelectOptions(modules = []) {
  return modules.map((module) => ({
    id: module.module_name,
    name: formatModuleLabel(module.module_name, modules),
  }))
}

export function mapModulePermissionSelectOptions(permissionsMap = {}) {
  return Object.entries(permissionsMap).map(([key, label]) => {
    const displayLabel = (label || '').trim()
    if (displayLabel && displayLabel !== key) {
      return { id: key, name: `${displayLabel} · ${key}` }
    }
    return { id: key, name: key }
  })
}

export function mapStringOptions(values = []) {
  return values.map((value) => ({ id: value, name: value }))
}
