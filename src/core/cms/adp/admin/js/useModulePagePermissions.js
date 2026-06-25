import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { GetPages, GetPolicies, GetRoles, GetRoleGroups } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { logError } from '@/js/utils/logError.js'

const ROOT_SUBMODULE_KEY = '__root__'
const ROOT_SUBMODULE_TITLE = 'Общее'

// Технические корневые страницы, которые должны попадать в модуль core
const CORE_TECHNICAL_PATHS = ['/', '/forget-password', '/logout']

const inferModuleKeyFromPath = path => {
  if (!path || typeof path !== 'string') {
    return 'core'
  }

  // Технические страницы всегда в модуле core
  if (CORE_TECHNICAL_PATHS.includes(path)) {
    return 'core'
  }

  const clean = path.startsWith('/') ? path.slice(1) : path
  const segments = clean.split('/')
  const firstSegment = segments[0] || 'core'

  if (!firstSegment) {
    return 'core'
  }

  if (firstSegment === 'admin-panel') {
    return 'core-admin'
  }

  // Путь без второго сегмента считаем частью core (например, /login)
  if (segments.length < 2) {
    return 'core'
  }

  return firstSegment
}

const inferSubmoduleKeyFromPath = path => {
  if (!path || typeof path !== 'string') {
    return ROOT_SUBMODULE_KEY
  }

  // Все технические страницы и корневые пути относятся к "Общему" сабмодулю
  if (CORE_TECHNICAL_PATHS.includes(path)) {
    return ROOT_SUBMODULE_KEY
  }

  const clean = path.startsWith('/') ? path.slice(1) : path
  const segments = clean.split('/')

  if (segments.length < 2) {
    return ROOT_SUBMODULE_KEY
  }

  return segments[1] || ROOT_SUBMODULE_KEY
}

export function useModulePagePermissions() {
  const toast = useToast()

  const modules = ref([])
  const selectedModuleKey = ref(null)
  const selectedSubmoduleKey = ref(null)
  const selectedPagePath = ref('')

  const roles = ref([])
  const roleGroups = ref([])
  const policies = ref([])

  const rowsPerPage = ref(20)
  const searchQuery = ref('')

  const isLoading = ref(false)
  const errorMessage = ref('')

  const buildModulesFromPages = pages => {
    const groups = {}

    for (const page of pages) {
      const moduleKey = page.module || page.module_name || inferModuleKeyFromPath(page.path)
      const submoduleKey = inferSubmoduleKeyFromPath(page.path)

      if (!groups[moduleKey]) {
        groups[moduleKey] = {
          key: moduleKey,
          title: page.module_verbose_name || page.module_title || moduleKey,
          submodules: {}
        }
      }

      const moduleGroup = groups[moduleKey]

      if (!moduleGroup.submodules[submoduleKey]) {
        moduleGroup.submodules[submoduleKey] = {
          key: submoduleKey,
          title: submoduleKey === ROOT_SUBMODULE_KEY ? ROOT_SUBMODULE_TITLE : submoduleKey,
          pages: []
        }
      }

      moduleGroup.submodules[submoduleKey].pages.push({
        path: page.path,
        label: page.title || page.name || page.path
      })
    }

    return Object.values(groups).map(module => ({
      key: module.key,
      title: module.title,
      submodules: Object.values(module.submodules)
    }))
  }

  const visibleSubmodules = computed(() => {
    const module = modules.value.find(m => m.key === selectedModuleKey.value)
    return module ? module.submodules : []
  })

  const visiblePages = computed(() => {
    const module = modules.value.find(m => m.key === selectedModuleKey.value)
    if (!module) {
      return []
    }

    const submodules = module.submodules || []
    const pages = []

    for (const sub of submodules) {
      if (Array.isArray(sub.pages)) {
        pages.push(...sub.pages)
      }
    }

    return pages
  })

  const selectedPage = computed(() => {
    if (!selectedPagePath.value) {
      return null
    }

    for (const module of modules.value) {
      for (const sub of module.submodules || []) {
        const page = sub.pages.find(p => p.path === selectedPagePath.value)
        if (page) {
          return page
        }
      }
    }

    return null
  })

  const pagePolicies = computed(() => {
    if (!selectedPagePath.value) {
      return []
    }

    return policies.value
      .filter(policy => policy.resource_path === selectedPagePath.value)
      .map(policy => ({
        id: policy.id,
        name: policy.name,
        policy_type: policy.policy_type_display,
        action: policy.action_display,
        resource_path: policy.resource_path,
        is_pattern: policy.is_pattern,
        priority: policy.priority,
        role_name: policy.role_name,
        role_group_name: policy.role_group_name,
        raw_role: policy.role,
        raw_role_group: policy.role_group
      }))
  })

  const handleSelectModule = key => {
    selectedModuleKey.value = key

    const module = modules.value.find(m => m.key === key)

    if (module && module.submodules && module.submodules.length > 0) {
      selectedSubmoduleKey.value = module.submodules[0].key

      const firstSub = module.submodules[0]
      if (firstSub.pages.length > 0) {
        selectedPagePath.value = firstSub.pages[0].path
        return
      }
    }

    selectedSubmoduleKey.value = null
    selectedPagePath.value = ''
  }

  const handleSelectSubmodule = key => {
    selectedSubmoduleKey.value = key

    const module = modules.value.find(m => m.key === selectedModuleKey.value)
    if (!module) {
      selectedPagePath.value = ''
      return
    }

    const sub = (module.submodules || []).find(s => s.key === key)
    if (sub && sub.pages.length > 0) {
      selectedPagePath.value = sub.pages[0].path
    } else {
      selectedPagePath.value = ''
    }
  }

  const handleSelectPage = path => {
    selectedPagePath.value = path
  }

  const handleChangeRows = newRowsPerPage => {
    rowsPerPage.value = newRowsPerPage
  }

  const handleSearchQuery = query => {
    searchQuery.value = query
  }

  const loadData = async () => {
    try {
      isLoading.value = true
      errorMessage.value = ''

      const [pagesResponse, rolesResponse, roleGroupsResponse, policiesResponse] = await Promise.all([
        GetPages(),
        GetRoles(),
        GetRoleGroups(),
        GetPolicies()
      ])

      const pages = (pagesResponse && pagesResponse.pages) || []

      modules.value = buildModulesFromPages(pages)
      roles.value = rolesResponse || []
      roleGroups.value = roleGroupsResponse || []
      policies.value = policiesResponse || []

      if (!selectedModuleKey.value && modules.value.length > 0) {
        selectedModuleKey.value = modules.value[0].key
      }

      const module = modules.value.find(m => m.key === selectedModuleKey.value)
      if (module && module.submodules && module.submodules.length > 0) {
        if (!selectedSubmoduleKey.value) {
          selectedSubmoduleKey.value = module.submodules[0].key
        }

        const sub =
          module.submodules.find(s => s.key === selectedSubmoduleKey.value) || module.submodules[0]

        if (sub.pages.length > 0 && !selectedPagePath.value) {
          selectedPagePath.value = sub.pages[0].path
        }
      }
    } catch (error) {
      logError('Ошибка загрузки данных прав по страницам модулей', error)
      errorMessage.value = 'Не удалось загрузить список модулей и политик. Попробуйте позже.'
      toast.error('Не удалось загрузить данные прав. Попробуйте позже.')
    } finally {
      isLoading.value = false
    }
  }

  return {
    modules,
    selectedModuleKey,
    selectedSubmoduleKey,
    selectedPagePath,
    visibleSubmodules,
    visiblePages,
    selectedPage,
    roles,
    roleGroups,
    policies,
    pagePolicies,
    rowsPerPage,
    searchQuery,
    isLoading,
    errorMessage,
    handleSelectModule,
    handleSelectSubmodule,
    handleSelectPage,
    handleChangeRows,
    handleSearchQuery,
    loadData
  }
}


