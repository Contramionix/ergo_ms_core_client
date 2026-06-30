<script setup>
import { ref } from 'vue'
import { Copy, Mail } from 'lucide-vue-next'
import { createInvitation } from '@/core/cms/adp/admin/js/invitationService'
import { copyTextToClipboard } from '@/js/utils/clipboard.js'
import ModalCenter from '@/components/ModalCenter.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'created'])

const email = ref('')
const note = ref('')
const error = ref('')
const isSubmitting = ref(false)

const resetForm = () => {
  email.value = ''
  note.value = ''
  error.value = ''
}

const close = () => {
  if (isSubmitting.value) return
  resetForm()
  emit('close')
}

const extractApiError = (apiError, fallback = 'Не удалось выполнить операцию') => {
  const data = apiError?.response?.data
  if (!data) {
    return fallback
  }
  if (typeof data.error === 'string') {
    return data.error
  }
  if (typeof data.detail === 'string') {
    return data.detail
  }
  const firstFieldError = Object.values(data).find((value) => Array.isArray(value) && value.length)
  if (firstFieldError) {
    return String(firstFieldError[0])
  }
  return fallback
}

const submit = async (sendEmail) => {
  error.value = ''
  if (!email.value.trim()) {
    error.value = 'Укажите email'
    return
  }

  isSubmitting.value = true
  try {
    const result = await createInvitation({
      email: email.value.trim(),
      note: note.value.trim(),
      send_email: sendEmail,
    })

    emit('created', {
      result,
      sendEmail,
      emailWarning: result.email_warning || null,
    })

    if (!sendEmail && result.invite_url) {
      try {
        await copyTextToClipboard(result.invite_url)
      } catch {
        // ссылка создана, но буфер обмена недоступен
      }
    }

    isSubmitting.value = false
    close()
  } catch (apiError) {
    error.value = extractApiError(apiError, 'Не удалось создать приглашение')
    isSubmitting.value = false
  }
}
</script>

<template>
  <ModalCenter
    standalone
    modal-id="invitationCreateModal"
    title="Новое приглашение"
    :visible="visible"
    :close-on-esc="false"
    @close="close"
  >
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <p class="text-muted small">
      Выберите действие: получить ссылку для ручной отправки или сразу отправить письмо на email.
    </p>

    <div class="mb-3">
      <label class="form-label" for="invite-email">Email</label>
      <input
        id="invite-email"
        v-model="email"
        type="email"
        class="form-control"
        placeholder="user@example.com"
        :disabled="isSubmitting || disabled"
      />
    </div>

    <div class="mb-0">
      <label class="form-label" for="invite-note">Примечание (необязательно)</label>
      <input
        id="invite-note"
        v-model="note"
        type="text"
        class="form-control"
        placeholder="Например: отдел аналитики"
        :disabled="isSubmitting || disabled"
      />
    </div>

    <template #footer>
      <div class="d-flex flex-wrap gap-2 justify-content-end w-100">
        <button type="button" class="btn btn-secondary" :disabled="isSubmitting" @click="close">
          Отмена
        </button>
        <button
          type="button"
          class="btn btn-primary d-inline-flex align-items-center gap-2"
          :disabled="isSubmitting || disabled"
          @click="submit(false)"
        >
          <Copy :size="16" />
          <span>{{ isSubmitting ? 'Создание...' : 'Создать и скопировать ссылку' }}</span>
        </button>
        <button
          type="button"
          class="btn btn-primary d-inline-flex align-items-center gap-2"
          :disabled="isSubmitting || disabled"
          @click="submit(true)"
        >
          <Mail :size="16" />
          <span>{{ isSubmitting ? 'Отправка...' : 'Создать и отправить письмо' }}</span>
        </button>
      </div>
    </template>
  </ModalCenter>
</template>
