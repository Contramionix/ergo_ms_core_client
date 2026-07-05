<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'
import { CreateRoleGroup, GetRoles, UpdateRoleGroup } from '@/core/cms/adp/admin/js/GroupsPolitics'
import { mapRoleSelectOptions } from '@/core/cms/js/adminSelectOptions.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modalId: { type: String, default: 'groupAdd' },
  mode: {
    type: String,
    default: 'create',
    validator: value => ['create', 'update'].includes(value),
  },
  group: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:visible', 'addGroup', 'changeGroup'])

const isEditMode = computed(() => props.mode === 'update')
const modalTitle = computed(() =>
  isEditMode.value ? 'Редактировать ролевую группу' : 'Добавить новую ролевую группу',
)
const toast = useToast()

const name = ref('')
const roles = ref([])
const parentRoleId = ref(null)
const description = ref('')
const isActive = ref(true)
const isSubmitting = ref(false)
const groupId = ref(null)

const showErrorName = ref(false)
const showErrorRole = ref(false)

const availableRoles = computed(() => roles.value)
const roleSelectOptions = computed(() => mapRoleSelectOptions(availableRoles.value))
const submitButtonText = computed(() => {
  if (isSubmitting.value) {
    return 'Сохранение...'
  }
  return isEditMode.value ? 'Изменить' : 'Добавить'
})

const formId = computed(() => `${props.modalId}-form`)

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
  parentRoleId.value = group.parent_role || null
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
  { immediate: true },
)

watch(
  () => props.visible,
  open => {
    if (!open) {
      return
    }
    if (isEditMode.value && props.group) {
      syncWithGroup(props.group)
    }
    showErrorName.value = false
    showErrorRole.value = false
  },
)

const resetForm = () => {
  name.value = ''
  parentRoleId.value = null
  description.value = ''
  isActive.value = true
  groupId.value = null
  showErrorName.value = false
  showErrorRole.value = false
}

const closeModal = () => {
  if (isEditMode.value && props.group) {
    syncWithGroup(props.group)
  } else {
    resetForm()
  }
  emit('update:visible', false)
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
      is_active: isActive.value,
    }

    if (isEditMode.value) {
      await UpdateRoleGroup(groupId.value, payload)
      toast.success('Ролевая группа успешно обновлена')
      emit('changeGroup')
      syncWithGroup({
        ...payload,
        id: groupId.value,
      })
    } else {
      await CreateRoleGroup(payload)
      toast.success('Ролевая группа успешно создана')
      emit('addGroup')
      resetForm()
    }

    emit('update:visible', false)
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
</script>

<template>
  <ModalCenter
    :modal-id="modalId"
    standalone
    :visible="visible"
    :title="modalTitle"
    size="md"
    scrollable
    @closemodal="closeModal"
  >
    <form :id="formId" @submit.prevent="submitForm" novalidate>
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
        <SelectBox
          id="roleSelect"
          v-model="parentRoleId"
          label="Родительская роль"
          :options="roleSelectOptions"
          value-key="id"
          label-key="name"
          all-label="Выберите роль"
          cast-to-number
          :disabled="availableRoles.length === 0" />
        <div v-if="availableRoles.length === 0" class="form-text text-danger">
          Нет доступных ролей для привязки. Сначала создайте пользовательскую роль.
        </div>
        <div v-if="showErrorRole" class="invalid-feedback d-block">Необходимо выбрать родительскую роль.</div>
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
    </form>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="isSubmitting" @click="closeModal">
        Отмена
      </button>
      <button type="submit" :form="formId" class="ui-btn ui-btn--primary" :disabled="isSubmitting">
        {{ submitButtonText }}
      </button>
    </template>
  </ModalCenter>
</template>
