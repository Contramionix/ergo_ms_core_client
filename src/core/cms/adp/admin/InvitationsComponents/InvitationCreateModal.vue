<script setup>
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { ref, watch } from 'vue'
import { Copy, Mail } from '@lucide/vue'
import { createInvitation } from '@/core/cms/adp/admin/js/invitationService'
import { copyTextToClipboard } from '@/js/utils/clipboard.js'
import { extractApiError } from '@/js/utils/apiErrorMessage.js'
import { logError } from '@/js/utils/logError.js'
import ModalCenter from '@/components/ModalCenter.vue'

const { t } = useAppI18n()


const props = defineProps({
  visible: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'created'])

const formId = 'invitation-create-form'

const email = ref('')
const note = ref('')
const error = ref('')
const isSubmitting = ref(false)

watch(
  () => props.visible,
  (isOpen) => {
    if (isOpen) {
      resetForm()
    }
  },
)

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

const submit = async (sendEmail) => {
  error.value = ''
  if (!email.value.trim()) {
    error.value = t('admin.invitations.emailRequired')
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
    logError('Ошибка создания приглашения', apiError)
    error.value = extractApiError(apiError, t('admin.invitations.createFailed'))
    isSubmitting.value = false
  }
}
</script>

<template>
  <ModalCenter
    standalone
    modal-id="invitationCreateModal"
    :title="t('admin.invitations.newTitle')"
    size="md"
    scrollable
    :visible="visible"
    :close-on-esc="!isSubmitting"
    @close="close"
  >
    <form :id="formId" class="invitation-create-modal" @submit.prevent>
      <p class="invitation-create-modal__hint">
        {{ t('admin.invitations.createHint') }}
      </p>

      <div v-if="error" class="invitation-create-modal__error">{{ error }}</div>

      <div class="invitation-create-modal__field">
        <label class="invitation-create-modal__label" for="invite-email">Email</label>
        <input
          id="invite-email"
          v-model="email"
          type="email"
          class="invitation-create-modal__input"
          placeholder="user@example.com"
          :disabled="isSubmitting || disabled"
          autocomplete="email"
        />
      </div>

      <div class="invitation-create-modal__field">
        <label class="invitation-create-modal__label" for="invite-note">{{ t('admin.invitations.note') }}</label>
        <input
          id="invite-note"
          v-model="note"
          type="text"
          class="invitation-create-modal__input"
          :placeholder="t('admin.invitations.notePlaceholder')"
          :disabled="isSubmitting || disabled"
        />
        <p class="invitation-create-modal__help">{{ t('admin.invitations.noteHelp') }}</p>
      </div>
    </form>

    <template #footer>
      <button
        type="button"
        class="ui-btn ui-btn--secondary"
        :disabled="isSubmitting"
        @click="close"
      >
        {{ t('admin.invitations.cancel') }}
      </button>
      <button
        type="button"
        class="ui-btn ui-btn--secondary"
        :disabled="isSubmitting || disabled"
        @click="submit(false)"
      >
        <Copy :size="16" />
        <span>{{ isSubmitting ? t('admin.invitations.creating') : t('admin.invitations.createCopy') }}</span>
      </button>
      <button
        type="button"
        class="ui-btn ui-btn--primary"
        :disabled="isSubmitting || disabled"
        @click="submit(true)"
      >
        <Mail :size="16" />
        <span>{{ isSubmitting ? t('admin.invitations.sending') : t('admin.invitations.createSend') }}</span>
      </button>
    </template>
  </ModalCenter>
</template>

<style scoped lang="scss">
.invitation-create-modal {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.invitation-create-modal__hint {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--color-secondary-text);
}

.invitation-create-modal__error {
  padding: 0.625rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--bs-danger, #dc3545) 35%, var(--color-border));
  border-radius: $radius-usual;
  background: color-mix(in srgb, var(--bs-danger, #dc3545) 8%, var(--color-primary-background));
  color: var(--bs-danger, #dc3545);
  font-size: 0.8125rem;
}

.invitation-create-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.invitation-create-modal__label {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-secondary-text);
}

.invitation-create-modal__input {
  width: 100%;
  min-height: 2.125rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.875rem;
  color: var(--color-primary-text);
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: $radius-usual;
  box-shadow: none;

  &::placeholder {
    color: var(--color-secondary-text);
    opacity: 0.75;
  }

  &:focus,
  &:focus-visible {
    outline: none;
    background: var(--color-hover-background);
    border-color: var(--color-border);
  }

  &:disabled {
    opacity: 0.65;
  }
}

.invitation-create-modal__help {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-secondary-text);
}

:deep(.modal-footer) {
  flex-wrap: wrap;
  justify-content: flex-end;
}
</style>
