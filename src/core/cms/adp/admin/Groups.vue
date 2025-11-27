<script setup>
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
    console.error('Error updating groups:', error)
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
  <div class="card">
    <div class="mb-3">
      <GroupTableHeader
        @changeRowsPerPage="handleChangeRows"
        @searchRowData="handleSearchQuery"
        @updateGroups="updateGroups"
      />
    </div>

    <GroupTable
      :rows="rows"
      :headers="['Название группы', 'Родительская роль', 'Описание', 'Активна', 'Действия']"
      :rowsPerPage="rowsPerPage"
      :searchQuery="searchQuery"
      @updateGroups="updateGroups"
    />
  </div>
</template>

<style scoped lang="scss"></style>
