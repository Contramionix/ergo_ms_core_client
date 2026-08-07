import { getCurrentBcp47, tGlobal, teGlobal } from '@/i18n/index.js'

export function getPolicyTypeOptions() {
  return [
    { id: 'url', name: tGlobal('admin.policies.typeUrl') },
    { id: 'api', name: tGlobal('admin.policies.typeApi') },
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
    { id: 'role', name: tGlobal('admin.policies.targetRole') },
    { id: 'role_group', name: tGlobal('admin.policies.targetGroup') },
  ]
}

export function getPolicyPathModeOptions() {
  return [
    { id: 'pattern', name: tGlobal('admin.policies.pattern') },
    { id: 'page', name: tGlobal('admin.policies.page') },
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

function resolvePageTitle(page) {
  const titleKey = (page?.title_key || page?.titleKey || '').trim()
  if (titleKey && teGlobal(titleKey)) {
    return tGlobal(titleKey)
  }
  return (page?.title || page?.name || '').trim()
}

export function formatPageOptionLabel(page) {
  const title = resolvePageTitle(page)
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

function formatModuleSlug(moduleName) {
  return String(moduleName || '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function isSlugLikeModuleLabel(moduleName, label) {
  const normalized = String(label || '').trim()
  const key = String(moduleName || '').trim()
  if (!normalized || !key) {
    return true
  }
  if (normalized === key) {
    return true
  }
  // Django AppConfig default: slug.title() → "Slug_With_Underscores"
  const djangoTitle = key.replace(
    /[a-zA-Zа-яА-ЯёЁ]+/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  )
  if (normalized === djangoTitle) {
    return true
  }
  if (normalized.toLowerCase() === formatModuleSlug(key).toLowerCase()) {
    return true
  }
  return false
}

function resolveLocalizedModuleLabel(moduleName) {
  const candidates = [
    `${moduleName}.title`,
    `${moduleName}.routes.shell`,
    `${moduleName}.name`,
  ]
  for (const key of candidates) {
    if (teGlobal(key)) {
      const label = String(tGlobal(key) || '').trim()
      if (label) {
        return label
      }
    }
  }
  return ''
}

function resolveCatalogModuleKey(moduleName, moduleCatalog = []) {
  const raw = String(moduleName || '').trim()
  const key = !raw || raw === 'cms' || raw === 'internal' ? 'core' : raw
  if (!key || key === 'core') {
    return 'core'
  }
  if (moduleCatalog.some((item) => item?.module_name === key)) {
    return key
  }
  const names = moduleCatalog
    .map((item) => item?.module_name)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
  for (const name of names) {
    if (key.startsWith(`${name}_`) || key.startsWith(`${name}-`)) {
      return name
    }
  }
  return key
}

export function formatModuleLabel(moduleName, moduleCatalog = []) {
  const key = resolveCatalogModuleKey(moduleName, moduleCatalog)

  if (key === 'core') {
    return tGlobal('admin.policies.coreModule')
  }

  const localized = resolveLocalizedModuleLabel(key)
  if (localized) {
    return localized
  }

  const catalogEntry = moduleCatalog.find((item) => item.module_name === key)
  if (catalogEntry?.module_label) {
    const label = String(catalogEntry.module_label).trim()
    if (label && label.toUpperCase() !== 'CMS' && !isSlugLikeModuleLabel(key, label)) {
      return label
    }
  }

  return formatModuleSlug(key)
}

function resolvePageModuleKey(moduleName, moduleCatalog = []) {
  return resolveCatalogModuleKey(moduleName, moduleCatalog)
}

/**
 * URL-префиксы модуля по каталогу страниц (slug папки с `_` → URL с `-`).
 */
export function resolveModuleUrlPrefixes(moduleName, pages = []) {
  const moduleKey = resolvePageModuleKey(moduleName)
  const paths = pages
    .filter((page) => resolvePageModuleKey(page.module_name || page.module) === moduleKey)
    .map((page) => page.path)
    .filter((path) => typeof path === 'string' && path.startsWith('/'))

  if (!paths.length) {
    return [`/${String(moduleKey).replace(/_/g, '-')}`]
  }

  const splitPaths = paths.map((path) => path.split('/').filter(Boolean))
  const first = splitPaths[0]
  const common = []
  for (let index = 0; index < first.length; index += 1) {
    const segment = first[index]
    if (splitPaths.every((parts) => parts[index] === segment)) {
      common.push(segment)
    } else {
      break
    }
  }

  if (common.length > 0) {
    return [`/${common.join('/')}`]
  }

  const roots = new Set()
  for (const parts of splitPaths) {
    if (parts[0]) {
      roots.add(`/${parts[0]}`)
    }
  }
  return roots.size > 0 ? Array.from(roots) : [`/${String(moduleKey).replace(/_/g, '-')}`]
}

export function buildModulePageGroups(pages = [], moduleCatalog = []) {
  const groups = new Map()
  const locale = getCurrentBcp47()

  for (const module of moduleCatalog) {
    if (!module?.module_name) {
      continue
    }
    const key = resolvePageModuleKey(module.module_name, moduleCatalog)
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
    const moduleKey = resolvePageModuleKey(page.module_name || page.module, moduleCatalog)
    if (!groups.has(moduleKey)) {
      groups.set(moduleKey, {
        key: moduleKey,
        label: formatModuleLabel(moduleKey, moduleCatalog),
        pages: [],
      })
    }

    const title = resolvePageTitle(page)
    groups.get(moduleKey).pages.push({
      path: page.path,
      title,
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
  return buildModulePageGroups(pages, moduleCatalog)
    .filter((group) => (group.pages || []).length > 0)
    .map((group) => ({
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
