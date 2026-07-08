<script setup>
import PermissionTableHeader from '@/core/cms/adp/admin/PermissionsComponents/PermissionTableHeader.vue'
import PermissionTable from '@/core/cms/adp/admin/PermissionsComponents/PermissionTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getPolicies, getRoles, getRoleGroups } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { useCmsPageCatalog } from '@/core/cms/adp/admin/js/useCmsPageCatalog.js'
import { ref, onMounted } from 'vue'

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
  roles.value = await getRoles()
  roleGroups.value = await getRoleGroups()
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

const searchQuery = ref('')
const handleSearchQuery = (query) => {
  searchQuery.value = query
}
</script>

<template>
  <div class="d-flex flex-column gap-3">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
      <p class="access-control-tab-desc mb-0">
        Политики доступа к маршрутам: в модалке можно просмотреть все модули и их страницы.
        Синхронизация обновляет записи CMS в базе данных.
      </p>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm flex-shrink-0"
        :disabled="isSyncing || isCatalogLoading"
        @click="handleSyncRoutes"
      >
        <span
          v-if="isSyncing"
          class="spinner-border spinner-border-sm me-2"
          role="status"
          aria-hidden="true"
        ></span>
        {{ isSyncing ? 'Синхронизация...' : 'Синхронизировать маршруты' }}
      </button>
    </div>

    <div class="card">
      <div class="mb-3">
        <PermissionTableHeader
          :roles="roles"
          :role-groups="roleGroups"
          :pages="pages"
          :module-page-groups="modulePageGroups"
          :module-catalog="moduleCatalog"
          @changeRowsPerPage="handleChangeRows"
          @searchRowData="handleSearchQuery"
          @updatePermissions="updatePermissions"
        />
      </div>

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
          :headers="['Название', 'Тип политики', 'Действие', 'Ресурс', 'Цель', 'Шаблон', 'Приоритет', 'Действия']"
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
</style>
