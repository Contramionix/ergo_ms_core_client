<script setup>
import SubmitForm from '@/core/cms/adp/admin/PermissionsComponents/SubmitPermissionAdd.vue'
import { Plus } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps({
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true },
})

const emit = defineEmits(['updatePermissions'])
const showAddModal = ref(false)

const updatePermissions = () => {
  emit('updatePermissions')
}
</script>

<template>
  <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
    <label class="flex-grow-1" style="max-width: 280px;">
      <input type="search" class="form-control" placeholder="Поиск..." @input="$emit('searchRowData', $event.target.value)"/>
    </label>
    <button class="btn btn-primary d-inline-flex align-items-center gap-2" type="button" @click="showAddModal = true">
      <Plus :size="16" />
      Добавить политику
    </button>
    <SubmitForm v-model:visible="showAddModal" modal-id="policyAdd" :roles="props.roles" :role-groups="props.roleGroups" @add-permission="updatePermissions"/>
  </div>
</template>