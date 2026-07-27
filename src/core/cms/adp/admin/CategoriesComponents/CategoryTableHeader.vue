<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, defineAsyncComponent } from 'vue'
import SearchInput from '@/components/SearchInput.vue'
import { Plus } from 'lucide-vue-next'

const { t } = useAppI18n()


const SubmitForm = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/CategoriesComponents/SubmitCategory.vue'),
)

const showAddModal = ref(false)
const emit = defineEmits(['updateCategories', 'searchRowData'])

defineProps({
  searchQuery: { type: String, default: '' },
})

const updateCategories = () => {
  emit('updateCategories')
}
</script>

<template>
  <div class="table-header">
    <SearchInput :model-value="searchQuery" layout="fixed" :placeholder="t('admin.roles.search')" :show-icon="true" background="secondary" focus-border="primary" @update:model-value="$emit('searchRowData', $event)"/>
    <div class="actions-wrapper">
      <button class="btn btn-primary d-flex align-items-center gap-2" type="button" @click="showAddModal = true">
        <Plus :size="16" />
        <span>{{ t('admin.roles.add') }}</span>
      </button>
      <SubmitForm v-if="showAddModal" v-model:visible="showAddModal" modal-id="roleAdd" @add-category="updateCategories" />
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

.actions-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
