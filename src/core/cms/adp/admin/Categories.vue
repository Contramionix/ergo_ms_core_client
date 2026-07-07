<script setup>
import CategoryTableHeader from '@/core/cms/adp/admin/CategoriesComponents/CategoryTableHeader.vue'
import CategoryTable from '@/core/cms/adp/admin/CategoriesComponents/CategoryTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { getRoles } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { ref, onMounted } from 'vue'

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

const searchQuery = ref('')
const handleSearchQuery = (query) => (searchQuery.value = query)
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

      <LoadingContentArea :loading="isLoading">
        <CategoryTable
          :rows="rows"
          :headers="['Название роли', 'Описание', 'Системная', 'Действия']"
          :rowsPerPage="rowsPerPage"
          :searchQuery="searchQuery"
          @updateCategories="updateCategories"
        />
      </LoadingContentArea>
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
    margin-bottom: 0;
  }
}

.content-card {
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
</style>
