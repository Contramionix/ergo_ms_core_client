<script setup>
import SubmitForm from '@/core/cms/adp/admin/CategoriesComponents/SubmitCategory.vue'
import { Plus } from 'lucide-vue-next'
import { ref } from 'vue'

const showAddModal = ref(false)
const emit = defineEmits(['updateCategories'])

const updateCategories = () => {
  emit('updateCategories')
}
</script>

<template>
  <div class="table-header">
    <div class="search-wrapper">
      <input
        type="search"
        class="form-control search-input"
        placeholder="Поиск по ролям..."
        @input="$emit('searchRowData', $event.target.value)"
      />
    </div>
    <div class="actions-wrapper">
      <button class="btn btn-primary d-flex align-items-center gap-2" type="button" @click="showAddModal = true">
        <Plus :size="16" />
        <span>Добавить роль</span>
      </button>
      <SubmitForm v-model:visible="showAddModal" modal-id="roleAdd" @add-category="updateCategories" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.search-wrapper {
  flex: 0 1 280px;
  min-width: 180px;

  .search-input {
    border: 1px solid var(--color-border);
    background: var(--color-secondary-background);
    color: var(--color-primary-text);
    border-radius: 0.5rem;
    font-size: 0.875rem;

    &:focus {
      border-color: var(--color-primary-text);
      box-shadow: none;
    }

    &::placeholder {
      color: var(--color-secondary-text);
    }
  }
}

.actions-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
