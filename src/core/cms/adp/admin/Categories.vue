<script setup>
import { logError } from '@/js/utils/logError.js'
import CategoryTableHeader from '@/core/cms/adp/admin/CategoriesComponents/CategoryTableHeader.vue'
import CategoryTable from '@/core/cms/adp/admin/CategoriesComponents/CategoryTable.vue'
import { GetRoles } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { ref, onMounted } from 'vue'

const rows = ref([])

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
    logError('Error fetching roles:', error)
  }
})

const rowsPerPage = ref(30)
const handleChangeRows = (newRowsPerPage) => (rowsPerPage.value = newRowsPerPage)

const searchQuery = ref('')
const handleSearchQuery = (query) => (searchQuery.value = query)

const updateCategories = async () => {
  try {
    await loadRoles()
  } catch (error) {
    logError('Error updating roles:', error)
  }
}
</script>

<template>
  <div class="categories-page">
    <div class="page-header">
      <h1 class="page-title">Роли</h1>
      <p class="page-subtitle">Управление ролями пользователей системы</p>
    </div>

    <div class="content-card">
      <CategoryTableHeader
        @changeRowsPerPage="handleChangeRows"
        @searchRowData="handleSearchQuery"
        @updateCategories="updateCategories"
      />

      <CategoryTable
        :rows="rows"
        :headers="['Название роли', 'Описание', 'Системная', 'Действия']"
        :rowsPerPage="rowsPerPage"
        :searchQuery="searchQuery"
        @updateCategories="updateCategories"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.categories-page {
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
