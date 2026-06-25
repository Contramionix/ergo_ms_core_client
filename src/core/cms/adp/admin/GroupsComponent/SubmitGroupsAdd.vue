<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { CreateRoleGroup, GetRoles, UpdateRoleGroup } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { logError } from '@/js/utils/logError.js'

const emit = defineEmits(['addGroup', 'changeGroup'])

const props = defineProps({
  mode: {
    type: String,
    default: 'create',
    validator: value => ['create', 'update'].includes(value)
  },
  group: {
    type: Object,
    default: null
  }
})

const isEditMode = computed(() => props.mode === 'update')
const toast = useToast()

const name = ref('')
const roles = ref([])
const parentRoleId = ref('')
const description = ref('')
const isActive = ref(true)
const isSubmitting = ref(false)
const groupId = ref(null)

const showErrorName = ref(false)
const showErrorRole = ref(false)

const availableRoles = computed(() => roles.value)
const submitButtonText = computed(() => {
  if (isSubmitting.value) {
    return 'Сохранение...'
  }
  return isEditMode.value ? 'Изменить' : 'Добавить'
})

const loadRoles = async () => {
  try {
    const response = await GetRoles()
    roles.value = response
  } catch (error) {
    toast.error('Не удалось загрузить список ролей')
    logError('GetRoles error:', error)
  }
}

onMounted(() => {
  loadRoles()
})

const syncWithGroup = group => {
  if (!group) {
    return
  }
  groupId.value = group.id ?? null
  name.value = group.name || ''
  parentRoleId.value = group.parent_role || ''
  description.value = group.description || ''
  isActive.value = group.is_active ?? true
}

watch(
  () => props.group,
  async newGroup => {
    if (!isEditMode.value || !newGroup) {
      return
    }
    if (!roles.value.length) {
      await loadRoles()
    }
    syncWithGroup(newGroup)
  },
  { immediate: true }
)

const resetForm = () => {
  name.value = ''
  parentRoleId.value = ''
  description.value = ''
  isActive.value = true
  groupId.value = null
  showErrorName.value = false
  showErrorRole.value = false
}

const submitForm = async () => {
  showErrorName.value = !name.value.trim()
  showErrorRole.value = !parentRoleId.value

  if (showErrorName.value || showErrorRole.value || (isEditMode.value && !groupId.value)) {
    return
  }

  try {
    isSubmitting.value = true
    const payload = {
      name: name.value.trim(),
      parent_role: parentRoleId.value,
      description: description.value || '',
      is_active: isActive.value
    }

    if (isEditMode.value) {
      await UpdateRoleGroup(groupId.value, payload)
      toast.success('Ролевая группа успешно обновлена')
      emit('changeGroup')
      syncWithGroup({
        ...payload,
        id: groupId.value
      })
    } else {
      await CreateRoleGroup(payload)
      toast.success('Ролевая группа успешно создана')
      emit('addGroup')
      resetForm()
    }
  } catch (error) {
    const responseData = error?.response?.data
    const defaultMessage = isEditMode.value
      ? 'Не удалось обновить ролевую группу'
      : 'Не удалось создать ролевую группу'
    const message = responseData?.error || responseData?.detail || defaultMessage
    toast.error(message)
    logError('SubmitRoleGroup error:', error)
  } finally {
    isSubmitting.value = false
  }
}

const canDismiss = computed(() => name.value.trim() !== '' && !!parentRoleId.value)

const close = () => {
  if (isEditMode.value && props.group) {
    syncWithGroup(props.group)
    return
  }
  resetForm()
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
        :disabled="availableRoles.length === 0"
      >
        <option value="" disabled>Выберите роль</option>
        <option v-for="role in availableRoles" :key="role.id" :value="role.id">
          {{ role.name }} ({{ role.role_type_display }})
        </option>
      </select>
      <div v-if="availableRoles.length === 0" class="form-text text-danger">
        Нет доступных ролей для привязки. Сначала создайте пользовательскую роль.
      </div>
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
      <button
        type="submit"
        class="btn btn-primary"
        :data-bs-dismiss="canDismiss ? 'modal' : ''"
        :disabled="isSubmitting"
      >
        {{ submitButtonText }}
      </button>
    </div>
  </form>
</template>
