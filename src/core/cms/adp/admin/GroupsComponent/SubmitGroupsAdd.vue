<script setup>
import { ref, onMounted, computed } from 'vue'
import { CreateRoleGroup, GetRoles } from '@/core/cms/adp/admin/js/GroupsPolitics'

const emit = defineEmits(['addGroup'])

const name = ref('')
const roles = ref([])
const parentRoleId = ref('')
const description = ref('')
const isActive = ref(true)

const showErrorName = ref(false)
const showErrorRole = ref(false)

const loadRoles = async () => {
  const response = await GetRoles()
  roles.value = response
}

onMounted(() => {
  loadRoles()
})

const submitForm = async () => {
  showErrorName.value = !name.value.trim()
  showErrorRole.value = !parentRoleId.value

  if (showErrorName.value || showErrorRole.value) {
    return
  }

  await CreateRoleGroup({
    name: name.value.trim(),
    parent_role: parentRoleId.value,
    description: description.value || '',
    is_active: isActive.value
  })

  emit('addGroup')
  name.value = ''
  parentRoleId.value = ''
  description.value = ''
  isActive.value = true
}

const canDismiss = computed(() => name.value.trim() !== '' && !!parentRoleId.value)

const close = () => {
  name.value = ''
  parentRoleId.value = ''
  description.value = ''
  isActive.value = true
}

defineExpose({ close })
</script>

<template>
  <form @submit.prevent="submitForm" novalidate>
    <div class="form-floating mb-3" v-auto-animate>
      <input
        type="text"
        id="nameInput"
        class="form-control"
        v-model="name"
        :class="{ 'is-invalid': showErrorName }"
        placeholder="Введите название группы"
      />
      <label for="nameInput">Введите название группы</label>
      <div v-if="showErrorName" class="invalid-feedback">Название обязательно для заполнения.</div>
    </div>

    <div class="mb-3">
      <label for="roleSelect" class="form-label">Родительская роль</label>
      <select
        id="roleSelect"
        class="form-select"
        v-model="parentRoleId"
        :class="{ 'is-invalid': showErrorRole }"
      >
        <option value="" disabled>Выберите роль</option>
        <option v-for="role in roles" :key="role.id" :value="role.id">
          {{ role.name }} ({{ role.role_type_display }})
        </option>
      </select>
      <div v-if="showErrorRole" class="invalid-feedback">Необходимо выбрать родительскую роль.</div>
    </div>

    <div class="form-floating mb-3">
      <textarea
        id="groupDescription"
        class="form-control"
        style="height: 100px"
        v-model="description"
        placeholder="Описание группы"
      ></textarea>
      <label for="groupDescription">Описание группы</label>
    </div>

    <div class="form-check mb-3">
      <input class="form-check-input" type="checkbox" id="activeCheckbox" v-model="isActive" />
      <label class="form-check-label" for="activeCheckbox">
        Группа активна
      </label>
    </div>

    <div class="mt-3 text-end">
      <button type="submit" class="btn btn-primary" :data-bs-dismiss="canDismiss ? 'modal' : ''">
        Добавить
      </button>
    </div>
  </form>
</template>
