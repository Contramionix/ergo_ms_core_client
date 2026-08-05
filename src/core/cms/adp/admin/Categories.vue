<script setup>
import CategoryTableHeader from '@/core/cms/adp/admin/CategoriesComponents/CategoryTableHeader.vue'
import CategoryTable from '@/core/cms/adp/admin/CategoriesComponents/CategoryTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getRoles } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { ref } from 'vue'
import { useServerSearchList } from '@/composables/useServerSearchList.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const rowsPerPage = ref(30)
const handleChangeRows = (newRowsPerPage) => {
  rowsPerPage.value = newRowsPerPage
}

const mapRoleRow = (role) => ({
  id: role.id,
  name: role.name,
  role_type: role.role_type,
  role_type_display: role.role_type_display,
  description: role.description,
  is_system: role.is_system,
})

const {
  rows,
  total,
  isLoading,
  searchQuery,
  currentPage,
  handleSearchQuery,
  goToPage,
  load,
} = useServerSearchList({
  pageSize: rowsPerPage,
  fetchItems: (params) => getRoles(params),
  mapRows: (items) => items.map(mapRoleRow),
})

const updateCategories = async () => {
  await load()
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
          :rows-per-page="rowsPerPage"
          :total-items="total"
          :current-page="currentPage"
          server-paginated
          @updateCategories="updateCategories"
          @page-change="goToPage"
        />
      </LoadingContentArea>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';
</style>
