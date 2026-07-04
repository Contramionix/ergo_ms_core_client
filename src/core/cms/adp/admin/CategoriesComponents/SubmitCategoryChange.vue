<script setup>
import { ref, watch, computed } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import { UpdateRole } from '@/core/cms/adp/admin/js/GroupsPolitics'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modalId: { type: String, default: 'roleEdit' },
  row: { type: Object, required: true },
})

const emit = defineEmits(['update:visible', 'changeCategory'])

const roleId = ref(null)
const name = ref('')
const roleType = ref('user')
const description = ref('')
const isSystem = ref(false)
const isSubmitting = ref(false)
const showErrorName = ref(false)

const formId = computed(() => `${props.modalId}-form`)

const syncWithRow = row => {
  if (!row) {
    return
  }
  roleId.value = row.id
  name.value = row.name || ''
  roleType.value = row.role_type || 'user'
  description.value = row.description || ''
  isSystem.value = Boolean(row.is_system)
}

watch(
  () => props.row,
  newRow => {
    syncWithRow(newRow)
  },
  { immediate: true },
)

watch(
  () => props.visible,
  open => {
    if (open) {
      syncWithRow(props.row)
      showErrorName.value = false
    }
  },
)

const closeModal = () => {
  syncWithRow(props.row)
  showErrorName.value = false
  emit('update:visible', false)
}

const submitForm = async () => {
  showErrorName.value = !name.value.trim()

  if (showErrorName.value || !roleId.value) {
    return
  }

  try {
    isSubmitting.value = true
    await UpdateRole(roleId.value, {
      name: name.value.trim(),
      role_type: roleType.value,
      description: description.value || '',
    })

    emit('changeCategory')
    emit('update:visible', false)
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
    title="Редактировать роль"
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
          placeholder="Введите название роли"
        />
        <label for="nameInput">Введите название роли</label>
        <div v-if="showErrorName" class="invalid-feedback">Название обязательно для заполнения.</div>
      </div>

      <div class="form-floating mb-3" v-auto-animate>
        <textarea
          id="descriptionInputChange"
          class="form-control"
          style="height: 100px"
          v-model="description"
          placeholder="Описание роли"
        ></textarea>
        <label for="descriptionInputChange">Описание роли</label>
      </div>
    </form>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="isSubmitting" @click="closeModal">
        Отмена
      </button>
      <button type="submit" :form="formId" class="ui-btn ui-btn--primary" :disabled="isSubmitting">
        {{ isSubmitting ? 'Сохранение...' : 'Изменить' }}
      </button>
    </template>
  </ModalCenter>
</template>
