<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, defineAsyncComponent } from 'vue'
import SearchInput from '@/components/SearchInput.vue'
import { Plus } from '@lucide/vue'

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

const handleSearchQuery = (query) => {
  emit('searchRowData', query)
}
</script>

<template>
  <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
    <SearchInput
      :model-value="searchQuery"
      :placeholder="t('admin.groups.search')"
      layout="fixed"
      :show-icon="true"
      @update:model-value="handleSearchQuery"
    />
    <button class="ui-btn ui-btn--primary" type="button" @click="showAddModal = true">
      <Plus :size="16" aria-hidden="true" />
      <span>{{ t('admin.groups.add') }}</span>
    </button>
    <SubmitForm
      v-if="showAddModal"
      v-model:visible="showAddModal"
      modal-id="groupAdd"
      @add-group="updateGroups()"
    />
  </div>
</template>
