<script setup>
import GroupTableHeader from '@/core/cms/adp/admin/GroupsComponent/GroupsTableHeader.vue'
import GroupTable from '@/core/cms/adp/admin/GroupsComponent/GroupsTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getRoleGroups } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { ref, computed, onMounted } from 'vue'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const rows = ref([])
const isLoading = ref(false)

const loadGroups = async () => {
  const groups = await getRoleGroups()
  rows.value = groups.map(group => ({
    id: group.id,
    name: group.name,
    parent_role: group.parent_role,
    parent_role_name: group.parent_role_name,
    description: group.description,
    is_active: group.is_active
  }))
}

const updateGroups = async () => {
  try {
    isLoading.value = true
    await loadGroups()
  } catch (error) {
    logError('Error updating groups:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(updateGroups)

const rowsPerPage = ref(30)
const handleChangeRows = newRowsPerPage => (rowsPerPage.value = newRowsPerPage)

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
          :rowsPerPage="rowsPerPage"
          :searchQuery="searchQuery"
          @updateGroups="updateGroups"
        />
      </LoadingContentArea>
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';
</style>
