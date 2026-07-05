<script setup>
import SubmitForm from '@/core/cms/adp/admin/GroupsComponent/SubmitGroupsAdd.vue'
import SearchInput from '@/components/SearchInput.vue'
import { Plus } from 'lucide-vue-next'
import { ref } from 'vue'

const emit = defineEmits(['updateGroups', 'searchRowData'])
const showAddModal = ref(false)

const updateGroups = () => {
  emit('updateGroups')
}
</script>

<template>
  <div class="table-header">
    <SearchInput layout="fixed" placeholder="Поиск по группам..." :show-icon="true" background="secondary" focus-border="primary" @update:model-value="$emit('searchRowData', $event)"/>
    <div class="actions-wrapper">
      <button class="btn btn-primary d-flex align-items-center gap-2" type="button" @click="showAddModal = true">
        <Plus :size="16" />
        <span>Добавить группу</span>
      </button>
      <SubmitForm v-model:visible="showAddModal" modal-id="groupAdd" @add-group="updateGroups()" />
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
