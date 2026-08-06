<script setup>
import { Loader2, RefreshCw } from 'lucide-vue-next'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import PermissionTableHeader from '@/core/cms/adp/admin/PermissionsComponents/PermissionTableHeader.vue'
import PermissionTable from '@/core/cms/adp/admin/PermissionsComponents/PermissionTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getPolicies, getRoles, getRoleGroups } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { useCmsPageCatalog } from '@/core/cms/adp/admin/js/useCmsPageCatalog.js'
import { useApiEndpointCatalog } from '@/core/cms/adp/admin/js/useApiEndpointCatalog.js'
import { invalidatePermissionsSnapshot } from '@/core/cms/adp/js/accessControl.js'
import { clearMenuCache } from '@/core/cms/js/menuService.js'
import { logError } from '@/js/utils/logError.js'
import { useToast } from '@/js/utils/toast.js'
import { ref, computed, onMounted } from 'vue'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'

const { t } = useAppI18n()
const toast = useToast()

const {
  pages,
  moduleCatalog,
  modulePageGroups,
  isLoading: isCatalogLoading,
  isSyncing,
  loadCatalog,
  syncRoutes,
  getPageLabel,
  getPageTitle,
} = useCmsPageCatalog()

const {
  pages: apiPages,
  moduleCatalog: apiModuleCatalog,
  modulePageGroups: apiModulePageGroups,
  isLoading: isApiCatalogLoading,
  isSyncing: isApiSyncing,
  loadCatalog: loadApiCatalog,
  syncEndpoints: syncApiEndpoints,
  getEndpointLabel,
} = useApiEndpointCatalog()

const isCatalogSyncing = computed(() => isSyncing.value || isApiSyncing.value)

const rows = ref([])
const roles = ref([])
const roleGroups = ref([])
const isLoading = ref(false)

const resolveResourceLabel = (path) => {
  const endpointLabel = getEndpointLabel(path)
  if (endpointLabel && endpointLabel !== path) {
    return endpointLabel
  }
  return getPageLabel(path)
}

const resolveResourceTitle = (path) => {
  const pageTitle = getPageTitle(path)
  if (pageTitle) {
    return pageTitle
  }
  const endpoint = apiPages.value.find((item) => item.path === path)
  return (endpoint?.title || endpoint?.name || '').trim()
}

const loadPolicies = async () => {
  const policies = await getPolicies()
  rows.value = policies.map((policy) => ({
    id: policy.id,
    name: policy.name,
    policy_type: policy.policy_type_display,
    raw_policy_type: policy.policy_type,
    action: policy.action_display,
    resource_path: policy.resource_path,
    is_pattern: policy.is_pattern,
    priority: policy.priority,
    role_name: policy.role_name,
    role_group_name: policy.role_group_name,
    raw_role: policy.role,
    raw_role_group: policy.role_group,
  }))
}

const updatePermissions = async () => {
  try {
    isLoading.value = true
    await loadPolicies()
    invalidatePermissionsSnapshot()
    clearMenuCache()
    window.dispatchEvent(new CustomEvent('menu-updated'))
  } catch (error) {
    logError('Ошибка загрузки политик доступа', error)
  } finally {
    isLoading.value = false
  }
}

const loadRefs = async () => {
  const [nextRoles, nextGroups] = await Promise.all([getRoles(), getRoleGroups()])
  roles.value = nextRoles
  roleGroups.value = nextGroups
}

const handleSyncCatalog = async () => {
  if (isCatalogSyncing.value || isCatalogLoading.value || isApiCatalogLoading.value) {
    return
  }

  const [routesOk, endpointsOk] = await Promise.all([
    syncRoutes({ silent: true }),
    syncApiEndpoints({ silent: true }),
  ])

  if (routesOk || endpointsOk) {
    await updatePermissions()
  }

  if (routesOk && endpointsOk) {
    toast.success(t('admin.policies.catalogSyncSuccess'))
    return
  }

  toast.error(t('admin.policies.catalogSyncError'))
}

onMounted(async () => {
  try {
    isLoading.value = true
    await Promise.all([loadRefs(), loadCatalog(), loadApiCatalog(), loadPolicies()])
  } catch (error) {
    logError('Ошибка инициализации политик доступа', error)
  } finally {
    isLoading.value = false
  }
})

const rowsPerPage = ref(30)
const handleChangeRows = (newRowsPerPage) => {
  rowsPerPage.value = newRowsPerPage
}

const { state: listState, patchState } = useRouteQueryState({
  q: { default: '' },
  page: { default: 1, type: 'number' },
}, { debounceKeys: ['q'], preserveKeys: ['tab'] })

const searchQuery = computed(() => listState.value.q)
const handleSearchQuery = (query) => {
  patchState({ q: query })
}

</script>

<template>
  <div class="d-flex flex-column gap-3">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-2">
      <p class="access-control-tab-desc mb-0">
        {{ t('admin.access.policiesTabHint1') }}
        {{ t('admin.access.policiesTabHint2') }}
        {{ t('admin.access.policiesTabHintApi') }}
      </p>
      <div class="access-control-sync-actions flex-shrink-0">
        <button
          type="button"
          class="ui-btn ui-btn--secondary"
          :disabled="isCatalogSyncing || isCatalogLoading || isApiCatalogLoading"
          @click="handleSyncCatalog"
        >
          <Loader2
            v-if="isCatalogSyncing"
            :size="16"
            class="access-control-sync-spinner"
            aria-hidden="true"
          />
          <RefreshCw v-else :size="16" aria-hidden="true" />
          <span>{{ isCatalogSyncing ? t('admin.access.syncing') : t('admin.access.syncCatalog') }}</span>
        </button>
      </div>
    </div>

    <div class="access-control-panel">
      <PermissionTableHeader
        :roles="roles"
        :role-groups="roleGroups"
        :pages="pages"
        :module-page-groups="modulePageGroups"
        :module-catalog="moduleCatalog"
        :api-pages="apiPages"
        :api-module-page-groups="apiModulePageGroups"
        :api-module-catalog="apiModuleCatalog"
        :search-query="searchQuery"
        @changeRowsPerPage="handleChangeRows"
        @searchRowData="handleSearchQuery"
        @updatePermissions="updatePermissions"
      />

      <LoadingContentArea :loading="isLoading || isCatalogLoading || isApiCatalogLoading">
        <PermissionTable
          :rows="rows"
          :roles="roles"
          :role-groups="roleGroups"
          :pages="pages"
          :module-page-groups="modulePageGroups"
          :module-catalog="moduleCatalog"
          :api-pages="apiPages"
          :api-module-page-groups="apiModulePageGroups"
          :api-module-catalog="apiModuleCatalog"
          :get-page-label="resolveResourceLabel"
          :get-page-title="resolveResourceTitle"
          :headers="[t('admin.access.headers.name'), t('admin.access.headers.type'), t('admin.access.headers.action'), t('admin.access.headers.resource'), t('admin.access.headers.target'), t('admin.access.headers.pattern'), t('admin.access.headers.priority'), t('admin.access.headers.actions')]"
          :rowsPerPage="rowsPerPage"
          :searchQuery="searchQuery"
          @updatePermissions="updatePermissions"
        />
      </LoadingContentArea>
    </div>
  </div>
</template>

<style scoped lang="scss">
.access-control-tab-desc {
  font-size: 0.875rem;
  color: var(--color-secondary-text);
}

.access-control-sync-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.access-control-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  padding: 1.25rem;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
}

.access-control-sync-spinner {
  animation: access-control-spin 0.75s linear infinite;
}

@keyframes access-control-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
