<script setup>
import { logError } from '@/js/utils/logError.js'
import GroupTableHeader from '@/core/cms/adp/admin/GroupsComponent/GroupsTableHeader.vue'
import GroupTable from '@/core/cms/adp/admin/GroupsComponent/GroupsTable.vue'
import { GetRoleGroups } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { ref, onMounted } from 'vue'

const rows = ref([])

const loadGroups = async () => {
  const groups = await GetRoleGroups()
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
    await loadGroups()
  } catch (error) {
    logError('Error updating groups:', error)
  }
}

onMounted(async () => {
  await updateGroups()
})

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

      <GroupTable
        :rows="rows"
        :headers="['Название группы', 'Родительская роль', 'Описание', 'Активна', 'Действия']"
        :rowsPerPage="rowsPerPage"
        :searchQuery="searchQuery"
        @updateGroups="updateGroups"
      />
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
    margin: 0;
  }
}

.content-card {
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
