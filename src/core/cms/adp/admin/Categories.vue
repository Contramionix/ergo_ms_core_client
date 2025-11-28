<script setup>
import CategoryTableHeader from '@/core/cms/adp/admin/CategoriesComponents/CategoryTableHeader.vue'
import CategoryTable from '@/core/cms/adp/admin/CategoriesComponents/CategoryTable.vue'
import { GetRoles } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { ref, onMounted } from 'vue' 

const rows = ref([]) // Initialize with empty array

const loadRoles = async () => {
  const roles = await GetRoles()
  rows.value = roles.map(role => ({
    id: role.id,
    name: role.name,
    role_type: role.role_type,
    role_type_display: role.role_type_display,
    description: role.description,
    is_system: role.is_system
  }))
}

onMounted(async () => {
  try {
    await loadRoles()
  } catch (error) {
    console.error('Error fetching roles:', error)
  }
})

const rowsPerPage = ref(30)
const handleChangeRows = (newRowsPerPage) => (rowsPerPage.value = newRowsPerPage)

// Поиск по названию
const searchQuery = ref('')
const handleSearchQuery = (query) => (searchQuery.value = query)

const updateCategories = async () => {
  try {
    await loadRoles()
  } catch (error) {
    console.error('Error updating roles:', error)
  }
}
</script>

<template>
  <div class="card">
    <div class="mb-3">
      <CategoryTableHeader
        @changeRowsPerPage="handleChangeRows"
        @searchRowData="handleSearchQuery"
        @updateCategories="updateCategories"
      />
    </div>

    <CategoryTable
      :rows="rows"
      :headers="['Название роли', 'Описание', 'Системная', 'Действия']"
      :rowsPerPage="rowsPerPage"
      :searchQuery="searchQuery"
      @updateCategories="updateCategories"
    />
  </div>
</template>


<style scoped lang="scss"></style>