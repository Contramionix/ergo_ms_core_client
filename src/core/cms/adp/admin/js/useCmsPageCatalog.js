import { ref, computed } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import { apiClient } from '@/js/api/manager'
import { getPages, getModuleCatalog } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import {
  buildModulePageGroups,
  formatPageOptionLabel,
  mapModuleSelectOptions,
  mapPagePathOptions,
} from '@/core/cms/js/adminSelectOptions.js'
import { tGlobal } from '@/i18n/index.js'

export function useCmsPageCatalog() {
  const toast = useToast()
  const pages = ref([])
  const moduleCatalog = ref([])
  const isLoading = ref(false)
  const isSyncing = ref(false)
  const errorMessage = ref('')

  const pagePathOptions = computed(() => mapPagePathOptions(pages.value))
  const moduleOptions = computed(() => mapModuleSelectOptions(pages.value, moduleCatalog.value))
  const modulePageGroups = computed(() => buildModulePageGroups(pages.value, moduleCatalog.value))

  const pageByPath = computed(() => {
    const map = new Map()
    for (const page of pages.value) {
      map.set(page.path, page)
    }
    return map
  })

  const getPageLabel = (path) => {
    const page = pageByPath.value.get(path)
    if (!page) {
      return path || ''
    }
    return formatPageOptionLabel(page)
  }

  const getPageTitle = (path) => {
    const page = pageByPath.value.get(path)
    return (page?.title || '').trim()
  }

  const loadModuleCatalog = async () => {
    try {
      const data = await getModuleCatalog()
      moduleCatalog.value = Array.isArray(data?.modules) ? data.modules : []
    } catch (error) {
      logError('Ошибка загрузки каталога модулей', error)
      moduleCatalog.value = []
    }
  }

  const loadPages = async () => {
    try {
      isLoading.value = true
      errorMessage.value = ''
      const response = await getPages()
      pages.value = (response && response.pages) || []
    } catch (error) {
      logError('Ошибка загрузки каталога страниц', error)
        errorMessage.value = tGlobal('admin.policies.catalogLoadError')
        toast.error(tGlobal('admin.policies.catalogLoadToast'))
      pages.value = []
    } finally {
      isLoading.value = false
    }
  }

  const loadCatalog = async () => {
    await Promise.all([loadModuleCatalog(), loadPages()])
  }

  const syncRoutes = async () => {
    if (isSyncing.value) {
      return false
    }

    try {
      isSyncing.value = true
      await apiClient.post('cms/patch-all-project-pages', {}, true)
      await loadCatalog()
      toast.success(tGlobal('admin.policies.syncSuccess'))
      return true
    } catch (error) {
      logError('Ошибка синхронизации маршрутов', error)
      toast.error(tGlobal('admin.policies.syncError'))
      return false
    } finally {
      isSyncing.value = false
    }
  }

  return {
    pages,
    moduleCatalog,
    pagePathOptions,
    moduleOptions,
    modulePageGroups,
    isLoading,
    isSyncing,
    errorMessage,
    getPageLabel,
    getPageTitle,
    loadPages,
    loadModuleCatalog,
    loadCatalog,
    syncRoutes,
  }
}
