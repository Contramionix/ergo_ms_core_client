<script setup>
import { ref, watch } from 'vue'
import { AssignRoleToUser } from '@/core/cms/adp/admin/js/GroupsPolitics'

const emit = defineEmits(['changeUserGroupsAndPermissions'])

const props = defineProps({
  row: { type: Object, required: true },
  roles: { type: Array, required: true },
  roleGroups: { type: Array, required: true }
})

const userId = ref(null)
const userName = ref('')
const selectedRoleId = ref('')
const selectedGroupIds = ref([])

watch(
  () => props.row,
  newRow => {
    userId.value = newRow.user_id
    userName.value = newRow.user
    selectedRoleId.value = newRow.role?.id || ''
    selectedGroupIds.value = newRow.role_groups?.map(group => group.id) || []
  },
  { immediate: true }
)

const submitForm = async () => {
  if (!userId.value || !selectedRoleId.value) {
    return
  }

  await AssignRoleToUser({
    user_id: userId.value,
    role_id: selectedRoleId.value,
    role_group_ids: selectedGroupIds.value
  })

  emit('changeUserGroupsAndPermissions')
}
</script>

<template>
  <form @submit.prevent="submitForm" novalidate>
    <h3 class="fw-semibold mb-3">Пользователь: {{ userName }}</h3>

    <div class="mb-3">
      <label for="roleSelect" class="form-label">Роль</label>
      <select id="roleSelect" class="form-select" v-model="selectedRoleId" required>
        <option value="" disabled>Выберите роль</option>
        <option v-for="role in roles" :key="role.id" :value="role.id">
          {{ role.name }} ({{ role.role_type_display }})
        </option>
      </select>
    </div>

    <div class="mb-3">
      <label for="groupSelect" class="form-label">Ролевые группы</label>
      <select
        id="groupSelect"
        class="form-select"
        multiple
        v-model="selectedGroupIds"
        size="5"
      >
        <option v-for="group in roleGroups" :key="group.id" :value="group.id">
          {{ group.name }} · {{ group.parent_role_name }}
        </option>
      </select>
      <small class="text-muted">Удерживайте Ctrl/Cmd для выбора нескольких групп.</small>
    </div>

    <div class="mt-3 text-end">
      <button type="submit" class="btn btn-primary" data-bs-dismiss="modal">
        Сохранить
      </button>
    </div>
  </form>
</template>
