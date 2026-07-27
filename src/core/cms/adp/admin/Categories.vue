<script setup>
import CategoryTableHeader from '@/core/cms/adp/admin/CategoriesComponents/CategoryTableHeader.vue'
import CategoryTable from '@/core/cms/adp/admin/CategoriesComponents/CategoryTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getRoles } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { ref, computed, onMounted } from 'vue'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const rows = ref([])
const isLoading = ref(false)

const loadRoles = async () => {
  const roles = await getRoles()
  rows.value = roles.map(role => ({
    id: role.id,
    name: role.name,
    role_type: role.role_type,
    role_type_display: role.role_type_display,
    description: role.description,
    is_system: role.is_system
  }))
}

const updateCategories = async () => {
  try {
    isLoading.value = true
    await loadRoles()
  } catch (error) {
    logError('Error updating roles:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(updateCategories)

const rowsPerPage = ref(30)
const handleChangeRows = (newRowsPerPage) => (rowsPerPage.value = newRowsPerPage)

const { state: listState, patchState } = useRouteQueryState({
  q: { default: '' },
  page: { default: 1, type: 'number' },
}, { debounceKeys: ['q'] })

const searchQuery = computed(() => listState.value.q)
const handleSearchQuery = (query) => {
  patchState({ q: query })
}
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('admin.roles.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.roles.subtitle') }}</p>
    </div>

    <div class="content-card">
      <CategoryTableHeader
        :search-query="searchQuery"
        @changeRowsPerPage="handleChangeRows"
        @searchRowData="handleSearchQuery"
        @updateCategories="updateCategories"
      />

      <LoadingContentArea :loading="isLoading">
        <CategoryTable
          :rows="rows"
          :headers="[t('admin.roles.headers.name'), t('admin.roles.headers.description'), t('admin.roles.headers.system'), t('admin.roles.headers.actions')]"
          :rowsPerPage="rowsPerPage"
          :searchQuery="searchQuery"
          @updateCategories="updateCategories"
        />
      </LoadingContentArea>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';
</style>
