import { ref, computed } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import { apiClient } from '@/js/api/manager'
import { getModuleCatalog } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import {
  buildModulePageGroups,
  formatPageOptionLabel,
  mapModuleSelectOptions,
} from '@/core/cms/js/adminSelectOptions.js'
import { tGlobal } from '@/i18n/index.js'

function mapEndpointsAsPages(endpoints = []) {
  return endpoints.map((ep) => ({
    id: ep.id,
    path: ep.path,
    title: ep.title || ep.name || ep.path,
    name: ep.name || '',
    module_name: ep.module_name || ep.module || 'core',
    module: ep.module_name || ep.module || 'core',
  }))
}

export function useApiEndpointCatalog() {
  const toast = useToast()
  const endpoints = ref([])
  const moduleCatalog = ref([])
  const isLoading = ref(false)
  const isSyncing = ref(false)

  const pages = computed(() => mapEndpointsAsPages(endpoints.value))
  // moduleCatalog — только для локализованных подписей; группы с 0 эндпоинтов отфильтрует UI
  const moduleOptions = computed(() => mapModuleSelectOptions(pages.value, moduleCatalog.value))
  const modulePageGroups = computed(() => buildModulePageGroups(pages.value, moduleCatalog.value))

  const getEndpointLabel = (path) => {
    const ep = endpoints.value.find((item) => item.path === path)
    if (!ep) {
      return path || ''
    }
    return formatPageOptionLabel({
      path: ep.path,
      title: ep.title || ep.name,
    })
  }

  const loadModuleCatalog = async () => {
    try {
      const data = await getModuleCatalog()
      moduleCatalog.value = Array.isArray(data?.modules) ? data.modules : []
    } catch (error) {
      logError('Ошибка загрузки каталога модулей (API)', error)
      moduleCatalog.value = []
    }
  }

  const loadEndpoints = async () => {
    try {
      isLoading.value = true
      const response = await apiClient.get('cms/api-endpoints')
      const payload = response?.data ?? {}
      endpoints.value = Array.isArray(payload.endpoints) ? payload.endpoints : []
      // Подписи модулей из того же ответа — не зависим только от отдельного catalog API
      if (Array.isArray(payload.modules) && payload.modules.length) {
        moduleCatalog.value = payload.modules
      }
    } catch (error) {
      logError('Ошибка загрузки каталога API-эндпоинтов', error)
      toast.error(tGlobal('admin.policies.apiCatalogLoadToast'))
      endpoints.value = []
    } finally {
      isLoading.value = false
    }
  }

  const loadCatalog = async () => {
    await loadEndpoints()
    if (!moduleCatalog.value.length) {
      await loadModuleCatalog()
    }
  }

  const syncEndpoints = async ({ silent = false } = {}) => {
    if (isSyncing.value) {
      return false
    }
    try {
      isSyncing.value = true
      await apiClient.post('cms/sync-api-endpoints', {}, true)
      await loadCatalog()
      if (!silent) {
        toast.success(tGlobal('admin.policies.apiSyncSuccess'))
      }
      return true
    } catch (error) {
      logError('Ошибка синхронизации API-эндпоинтов', error)
      if (!silent) {
        toast.error(tGlobal('admin.policies.apiSyncError'))
      }
      return false
    } finally {
      isSyncing.value = false
    }
  }

  return {
    endpoints,
    pages,
    moduleCatalog,
    moduleOptions,
    modulePageGroups,
    isLoading,
    isSyncing,
    getEndpointLabel,
    loadCatalog,
    syncEndpoints,
  }
}
