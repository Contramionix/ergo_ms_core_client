<script setup>
import { ref, defineAsyncComponent } from 'vue'
import SearchInput from '@/components/SearchInput.vue'
import { Plus } from 'lucide-vue-next'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const SubmitForm = defineAsyncComponent(() =>
  import('@/core/cms/adp/admin/PermissionsComponents/SubmitPermissionAdd.vue'),
)

const props = defineProps({
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true },
  pages: { type: Array, default: () => [] },
  modulePageGroups: { type: Array, default: () => [] },
  moduleCatalog: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits(['updatePermissions', 'changeRowsPerPage', 'searchRowData'])

const showAddModal = ref(false)

const updatePermissions = () => {
  emit('updatePermissions')
}

const handleSearchQuery = (query) => {
  emit('searchRowData', query)
}
</script>

<template>
  <div class="permission-table-header">
    <SearchInput
      id="policies-search"
      :model-value="searchQuery"
      :placeholder="t('admin.policies.searchPages')"
      layout="grow"
      :show-icon="true"
      @update:model-value="handleSearchQuery"
    />
    <button class="ui-btn ui-btn--primary flex-shrink-0" type="button" @click="showAddModal = true">
      <Plus :size="16" aria-hidden="true" />
      <span>{{ t('admin.policies.addPolicy') }}</span>
    </button>
    <SubmitForm
      v-if="showAddModal"
      v-model:visible="showAddModal"
      modal-id="policyAdd"
      :roles="props.roles"
      :role-groups="props.roleGroups"
      :pages="props.pages"
      :module-page-groups="props.modulePageGroups"
      :module-catalog="props.moduleCatalog"
      @add-permission="updatePermissions"
    />
  </div>
</template>

<style scoped lang="scss">
.permission-table-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  width: 100%;

  :deep(.search-input) {
    min-width: 0;
    max-width: 100%;
  }

  @media (width < $ui-bp-md) {
    grid-template-columns: 1fr;

    .ui-btn {
      width: 100%;
    }
  }
}
</style>
