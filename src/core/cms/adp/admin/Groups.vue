<script setup>
import GroupTableHeader from '@/core/cms/adp/admin/GroupsComponent/GroupsTableHeader.vue'
import GroupTable from '@/core/cms/adp/admin/GroupsComponent/GroupsTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getRoleGroups } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { ref, onMounted } from 'vue'

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

const searchQuery = ref('')
const handleSearchQuery = query => (searchQuery.value = query)
</script>

<template>
  <div class="groups-page">
    <div class="page-header">
      <h1 class="page-title">Ролевые группы</h1>
      <p class="page-subtitle">Управление группами ролей для организации доступа</p>
    </div>

    <div class="content-card">
      <GroupTableHeader
        @changeRowsPerPage="handleChangeRows"
        @searchRowData="handleSearchQuery"
        @updateGroups="updateGroups"
      />

      <LoadingContentArea :loading="isLoading">
        <GroupTable
          :rows="rows"
          :headers="['Название группы', 'Родительская роль', 'Описание', 'Активна', 'Действия']"
          :rowsPerPage="rowsPerPage"
          :searchQuery="searchQuery"
          @updateGroups="updateGroups"
        />
      </LoadingContentArea>
    </div>
  </div>
</template>

<style scoped lang="scss">
.groups-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  .page-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-primary-text);
    margin-bottom: 0.25rem;
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--color-secondary-text);
    margin-bottom: 0;
  }
}

.content-card {
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1.25rem;
}
</style>
