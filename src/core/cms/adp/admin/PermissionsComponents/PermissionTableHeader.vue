<script setup>
import ModalCenter from '@/components/ModalCenter.vue'
import SubmitForm from '@/core/cms/adp/admin/PermissionsComponents/SubmitPermissionAdd.vue'
import { Plus } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps({
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true }
})

const emit = defineEmits(['updatePermissions'])
const AddPermissionRef = ref(null)

const updatePermissions = () => {
  emit('updatePermissions')
}

const closemodal = () => {
  AddPermissionRef.value.close()
}
</script>

<template>
  <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
    <label class="flex-grow-1" style="max-width: 280px;">
      <input
        type="search"
        class="form-control"
        placeholder="Поиск..."
        @input="$emit('searchRowData', $event.target.value)"
      />
    </label>
    <button class="btn btn-primary d-inline-flex align-items-center gap-2" data-bs-toggle="modal" data-bs-target="#roleAdd">
      <Plus :size="16" />
      Добавить политику
    </button>
    <ModalCenter title="Добавить новую политику" modalId="roleAdd" @closemodal="closemodal()">
      <SubmitForm
        :roles="props.roles"
        :roleGroups="props.roleGroups"
        @addPermission="updatePermissions"
        ref="AddPermissionRef"
      />
    </ModalCenter>
  </div>
</template>

<style scoped lang="scss"></style>
