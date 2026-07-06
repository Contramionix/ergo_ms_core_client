<script setup>
import { ref, computed } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import { createRole } from '@/core/cms/adp/admin/js/adminAccessApi.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  modalId: { type: String, default: 'roleAdd' },
})

const emit = defineEmits(['update:visible', 'addCategory'])

const name = ref('')
const description = ref('')
const isSubmitting = ref(false)
const showErrorName = ref(false)
const DEFAULT_ROLE_TYPE = 'user'

const formId = computed(() => `${props.modalId}-form`)

const resetForm = () => {
  name.value = ''
  description.value = ''
  showErrorName.value = false
}

const closeModal = () => {
  resetForm()
  emit('update:visible', false)
}

const submitForm = async () => {
  showErrorName.value = !name.value.trim()

  if (showErrorName.value) {
    return
  }

  try {
    isSubmitting.value = true
    await createRole({
      name: name.value.trim(),
      role_type: DEFAULT_ROLE_TYPE,
      description: description.value || '',
    })

    emit('addCategory')
    resetForm()
    emit('update:visible', false)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <ModalCenter :modal-id="modalId" standalone :visible="visible" title="Добавить новую роль" size="md" scrollable @closemodal="closeModal">
    <form :id="formId" @submit.prevent="submitForm" novalidate>
      <div class="form-floating mb-3" v-auto-animate>
        <input type="text" id="nameInput" class="form-control" v-model="name" :class="{ 'is-invalid': showErrorName }" placeholder="Введите название роли"/>
        <label for="nameInput">Введите название роли</label>
        <div v-if="showErrorName" class="invalid-feedback">Название обязательно для заполнения.</div>
      </div>

      <div class="form-floating mb-3" v-auto-animate>
        <textarea id="descriptionInput" class="form-control" style="height: 100px" v-model="description" placeholder="Описание роли"></textarea>
        <label for="descriptionInput">Описание роли</label>
      </div>
    </form>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="isSubmitting" @click="closeModal">
        Отмена
      </button>
      <button type="submit" :form="formId" class="ui-btn ui-btn--primary" :disabled="isSubmitting">
        {{ isSubmitting ? 'Сохранение...' : 'Добавить' }}
      </button>
    </template>
  </ModalCenter>
</template>