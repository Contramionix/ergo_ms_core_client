<script setup>
import { Loader2, RefreshCw } from 'lucide-vue-next'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import PermissionTableHeader from '@/core/cms/adp/admin/PermissionsComponents/PermissionTableHeader.vue'
import PermissionTable from '@/core/cms/adp/admin/PermissionsComponents/PermissionTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getPolicies, getRoles, getRoleGroups } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { useCmsPageCatalog } from '@/core/cms/adp/admin/js/useCmsPageCatalog.js'
import { logError } from '@/js/utils/logError.js'
import { ref, computed, onMounted } from 'vue'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'

const { t } = useAppI18n()


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

const rows = ref([])
const roles = ref([])
const roleGroups = ref([])
const isLoading = ref(false)

const loadPolicies = async () => {
  const policies = await getPolicies()
  rows.value = policies.map((policy) => ({
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
    raw_role_group: policy.role_group,
  }))
}

const updatePermissions = async () => {
  try {
    isLoading.value = true
    await loadPolicies()
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

const handleSyncRoutes = async () => {
  const synced = await syncRoutes()
  if (synced) {
    await updatePermissions()
  }
}

onMounted(async () => {
  try {
    isLoading.value = true
    await Promise.all([loadRefs(), loadCatalog(), loadPolicies()])
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
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
      <p class="access-control-tab-desc mb-0">
        {{ t('admin.access.policiesTabHint1') }}
        {{ t('admin.access.policiesTabHint2') }}
      </p>
      <button
        type="button"
        class="ui-btn ui-btn--secondary flex-shrink-0"
        :disabled="isSyncing || isCatalogLoading"
        @click="handleSyncRoutes"
      >
        <Loader2
          v-if="isSyncing"
          :size="16"
          class="access-control-sync-spinner"
          aria-hidden="true"
        />
        <RefreshCw v-else :size="16" aria-hidden="true" />
        <span>{{ isSyncing ? t('admin.access.syncing') : t('admin.access.syncRoutes') }}</span>
      </button>
    </div>

    <div class="access-control-panel">
      <PermissionTableHeader
        :roles="roles"
        :role-groups="roleGroups"
        :pages="pages"
        :module-page-groups="modulePageGroups"
        :module-catalog="moduleCatalog"
        :search-query="searchQuery"
        @changeRowsPerPage="handleChangeRows"
        @searchRowData="handleSearchQuery"
        @updatePermissions="updatePermissions"
      />

      <LoadingContentArea :loading="isLoading || isCatalogLoading">
        <PermissionTable
          :rows="rows"
          :roles="roles"
          :role-groups="roleGroups"
          :pages="pages"
          :module-page-groups="modulePageGroups"
          :module-catalog="moduleCatalog"
          :get-page-label="getPageLabel"
          :get-page-title="getPageTitle"
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
