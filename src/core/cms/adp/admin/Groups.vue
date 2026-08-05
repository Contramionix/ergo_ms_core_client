<script setup>
import GroupTableHeader from '@/core/cms/adp/admin/GroupsComponent/GroupsTableHeader.vue'
import GroupTable from '@/core/cms/adp/admin/GroupsComponent/GroupsTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getRoleGroups } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { ref } from 'vue'
import { useServerSearchList } from '@/composables/useServerSearchList.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const rowsPerPage = ref(30)
const handleChangeRows = (newRowsPerPage) => {
  rowsPerPage.value = newRowsPerPage
}

const mapGroupRow = (group) => ({
  id: group.id,
  name: group.name,
  parent_role: group.parent_role,
  parent_role_name: group.parent_role_name,
  description: group.description,
  is_active: group.is_active,
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
  fetchItems: (params) => getRoleGroups(params),
  mapRows: (items) => items.map(mapGroupRow),
})

const updateGroups = async () => {
  await load()
}
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('admin.groups.title') }}</h1>
      <p class="page-subtitle">{{ t('admin.groups.subtitle') }}</p>
    </div>

    <div class="content-card">
      <GroupTableHeader
        :search-query="searchQuery"
        @changeRowsPerPage="handleChangeRows"
        @searchRowData="handleSearchQuery"
        @updateGroups="updateGroups"
      />

      <LoadingContentArea :loading="isLoading">
        <GroupTable
          :rows="rows"
          :headers="[t('admin.groups.headers.name'), t('admin.groups.headers.parent'), t('admin.groups.headers.description'), t('admin.groups.headers.active'), t('admin.groups.headers.actions')]"
          :rows-per-page="rowsPerPage"
          :total-items="total"
          :current-page="currentPage"
          server-paginated
          @updateGroups="updateGroups"
          @page-change="goToPage"
        />
      </LoadingContentArea>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';
</style>
