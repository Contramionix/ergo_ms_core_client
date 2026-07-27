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
  const catalogEntry = moduleCatalog.find((item) => item.module_name === moduleName)
  if (catalogEntry?.module_label) {
    return catalogEntry.module_label
  }

  if (moduleName === 'core') {
    return tGlobal('admin.policies.coreModule')
  }

  if (moduleName === 'cms') {
    return 'CMS'
  }

  return moduleName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function buildModulePageGroups(pages = [], moduleCatalog = []) {
  const groups = new Map()
  const locale = getCurrentBcp47()

  for (const module of moduleCatalog) {
    if (!module?.module_name) {
      continue
    }
    groups.set(module.module_name, {
      key: module.module_name,
      label: formatModuleLabel(module.module_name, moduleCatalog),
      pages: [],
    })
  }

  for (const page of pages) {
    const moduleKey = page.module_name || page.module || 'core'
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
    name: module.module_label || module.module_name,
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
