<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, defineAsyncComponent } from 'vue'
import SearchInput from '@/components/SearchInput.vue'
import { Plus } from 'lucide-vue-next'

const { t } = useAppI18n()


const SubmitForm = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/GroupsComponent/SubmitGroupsAdd.vue'),
)

const emit = defineEmits(['updateGroups', 'searchRowData'])
const showAddModal = ref(false)

defineProps({
  searchQuery: { type: String, default: '' },
})

const updateGroups = () => {
  emit('updateGroups')
}
</script>

<template>
  <div class="table-header">
    <SearchInput :model-value="searchQuery" layout="fixed" :placeholder="t('admin.groups.search')" :show-icon="true" background="secondary" focus-border="primary" @update:model-value="$emit('searchRowData', $event)"/>
    <div class="actions-wrapper">
      <button class="btn btn-primary d-flex align-items-center gap-2" type="button" @click="showAddModal = true">
        <Plus :size="16" />
        <span>{{ t('admin.groups.add') }}</span>
      </button>
      <SubmitForm v-if="showAddModal" v-model:visible="showAddModal" modal-id="groupAdd" @add-group="updateGroups()" />
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
