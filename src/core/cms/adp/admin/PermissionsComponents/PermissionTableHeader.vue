<script setup>
import SubmitForm from '@/core/cms/adp/admin/PermissionsComponents/SubmitPermissionAdd.vue'
import SearchInput from '@/components/SearchInput.vue'
import { Plus } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps({
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true },
  pages: { type: Array, default: () => [] },
  modulePageGroups: { type: Array, default: () => [] },
  moduleCatalog: { type: Array, default: () => [] },
})

const emit = defineEmits(['updatePermissions', 'changeRowsPerPage', 'searchRowData'])

const showAddModal = ref(false)
const searchQuery = ref('')

const updatePermissions = () => {
  emit('updatePermissions')
}

const handleSearchQuery = (query) => {
  searchQuery.value = query
  emit('searchRowData', query)
}
</script>

<template>
  <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
    <SearchInput
      v-model="searchQuery"
      placeholder="Поиск по названию или пути..."
      layout="fixed"
      :show-icon="true"
      @update:model-value="handleSearchQuery"
    />
    <button class="btn btn-primary d-inline-flex align-items-center gap-2" type="button" @click="showAddModal = true">
      <Plus :size="16" />
      Добавить политику
    </button>
    <SubmitForm
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
