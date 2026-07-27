<script setup>
import { ref, computed } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import { createRole } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

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
  <ModalCenter :modal-id="modalId" standalone :visible="visible" :title="t('admin.roles.addTitle')" size="md" scrollable @closemodal="closeModal">
    <form :id="formId" @submit.prevent="submitForm" novalidate>
      <div class="form-floating mb-3" v-auto-animate>
        <input type="text" id="nameInput" class="form-control" v-model="name" :class="{ 'is-invalid': showErrorName }" :placeholder="t('admin.roles.namePlaceholder')"/>
        <label for="nameInput">{{ t('admin.roles.namePlaceholder') }}</label>
        <div v-if="showErrorName" class="invalid-feedback">{{ t('admin.roles.nameRequired') }}</div>
      </div>

      <div class="form-floating mb-3" v-auto-animate>
        <textarea id="descriptionInput" class="form-control" style="height: 100px" v-model="description" :placeholder="t('admin.roles.descriptionPlaceholder')"></textarea>
        <label for="descriptionInput">{{ t('admin.roles.descriptionPlaceholder') }}</label>
      </div>
    </form>

    <template #footer>
      <button type="button" class="ui-btn ui-btn--secondary" :disabled="isSubmitting" @click="closeModal">
        {{ t('common.cancel') }}
      </button>
      <button type="submit" :form="formId" class="ui-btn ui-btn--primary" :disabled="isSubmitting">
        {{ isSubmitting ? t('admin.roles.saving') : t('common.add') }}
      </button>
    </template>
  </ModalCenter>
</template>