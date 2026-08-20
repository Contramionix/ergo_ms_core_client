<script setup>
import { computed, ref, watch } from 'vue'
import { Eye, EyeOff, CheckCircle, Shield } from '@lucide/vue'
import ModalCenter from '@/components/ModalCenter.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useProfile } from '@/core/cms/js/profileService.js'
import {
  passwordPolicy,
  validatePasswordValue,
  getPasswordRequirementHints,
} from '@/js/passwordPolicy.js'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'

const props = defineProps({
  show: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const { t } = useAppI18n()
const toast = useToast()
const { changePassword } = useProfile()

const formId = 'change-password-form'

const isCurrentPasswordVisible = ref(false)
const isNewPasswordVisible = ref(false)
const isConfirmPasswordVisible = ref(false)

const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const errors = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const isLoading = ref(false)

watch(
  () => props.show,
  (isOpen) => {
    if (isOpen) {
      resetForm()
    }
  },
)

const togglePasswordVisibility = (type) => {
  switch (type) {
    case 'currentPassword':
      isCurrentPasswordVisible.value = !isCurrentPasswordVisible.value
      break
    case 'newPassword':
      isNewPasswordVisible.value = !isNewPasswordVisible.value
      break
    case 'confirmPassword':
      isConfirmPasswordVisible.value = !isConfirmPasswordVisible.value
      break
  }
}

const currentPasswordFieldType = computed(() =>
  isCurrentPasswordVisible.value ? 'text' : 'password',
)
const newPasswordFieldType = computed(() => (isNewPasswordVisible.value ? 'text' : 'password'))
const confirmPasswordFieldType = computed(() =>
  isConfirmPasswordVisible.value ? 'text' : 'password',
)

const currentPasswordIcon = computed(() => (isCurrentPasswordVisible.value ? Eye : EyeOff))
const newPasswordIcon = computed(() => (isNewPasswordVisible.value ? Eye : EyeOff))
const confirmPasswordIcon = computed(() => (isConfirmPasswordVisible.value ? Eye : EyeOff))

const passwordRequirementHints = computed(() => getPasswordRequirementHints())

const passwordStrength = computed(() => {
  const password = form.value.newPassword
  if (!password) return { score: 0, label: '', tone: '' }

  let score = 0
  if (password.length >= passwordPolicy.minLength) score += 1
  if (password.length >= passwordPolicy.minLength + 4) score += 1
  if (!passwordPolicy.requireLowercase || /[a-z]/.test(password)) score += 1
  if (!passwordPolicy.requireUppercase || /[A-Z]/.test(password)) score += 1
  if (!passwordPolicy.requireDigit || /[0-9]/.test(password)) score += 1
  if (!passwordPolicy.requireSpecial || /[^A-Za-z0-9]/.test(password)) score += 1

  const strengthMap = {
    0: { label: '', tone: '' },
    1: { label: t('settings.changePassword.strengthVeryWeak'), tone: 'danger' },
    2: { label: t('settings.changePassword.strengthWeak'), tone: 'warning' },
    3: { label: t('settings.changePassword.strengthWeak'), tone: 'warning' },
    4: { label: t('settings.changePassword.strengthMedium'), tone: 'info' },
    5: { label: t('settings.changePassword.strengthStrong'), tone: 'success' },
    6: { label: t('settings.changePassword.strengthVeryStrong'), tone: 'success' },
  }

  return { score, ...strengthMap[score] }
})

const passwordsMatch = computed(
  () =>
    Boolean(form.value.confirmPassword)
    && Boolean(form.value.newPassword)
    && form.value.confirmPassword === form.value.newPassword,
)

const cleanErrors = () => {
  errors.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
}

const validateForm = () => {
  let isValid = true
  cleanErrors()

  if (!form.value.currentPassword) {
    errors.value.currentPassword = t('settings.changePassword.currentRequired')
    isValid = false
  }

  const passwordComplexityError = validatePasswordValue(form.value.newPassword)
  if (passwordComplexityError) {
    errors.value.newPassword = passwordComplexityError
    isValid = false
  }

  if (form.value.newPassword !== form.value.confirmPassword) {
    errors.value.confirmPassword = t('settings.changePassword.mismatch')
    isValid = false
  }

  return isValid
}

const resetForm = () => {
  form.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
  cleanErrors()
  isCurrentPasswordVisible.value = false
  isNewPasswordVisible.value = false
  isConfirmPasswordVisible.value = false
}

const handleClose = () => {
  emit('close')
}

const submitForm = async () => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true
  cleanErrors()

  try {
    await changePassword({
      current_password: form.value.currentPassword,
      new_password: form.value.newPassword,
      confirm_password: form.value.confirmPassword,
    })

    resetForm()
    toast.success(t('settings.changePassword.changed'))
    handleClose()
  } catch (error) {
    logError('Ошибка смены пароля', error)
    if (error.response?.data) {
      const serverErrors = error.response.data
      if (serverErrors.current_password) {
        errors.value.currentPassword = Array.isArray(serverErrors.current_password)
          ? serverErrors.current_password[0]
          : serverErrors.current_password
      }
      if (serverErrors.new_password) {
        errors.value.newPassword = Array.isArray(serverErrors.new_password)
          ? serverErrors.new_password[0]
          : serverErrors.new_password
      }
      if (serverErrors.confirm_password) {
        errors.value.confirmPassword = Array.isArray(serverErrors.confirm_password)
          ? serverErrors.confirm_password[0]
          : serverErrors.confirm_password
      }
      if (serverErrors.non_field_errors) {
        const generalError = Array.isArray(serverErrors.non_field_errors)
          ? serverErrors.non_field_errors[0]
          : serverErrors.non_field_errors
        toast.error(generalError)
      }
    } else {
      toast.error(t('settings.changePassword.changeError'))
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <ModalCenter
    standalone
    :visible="show"
    modal-id="changePasswordModal"
    :title="t('settings.changePassword.title')"
    :modal-aria-label="t('settings.changePassword.title')"
    size="md"
    scrollable
    @close="handleClose"
  >
    <form :id="formId" class="change-password-modal" @submit.prevent="submitForm">
      <div class="change-password-modal__field">
        <label class="change-password-modal__label" for="cpm-current-password">{{ t('settings.changePassword.current') }}</label>
        <div class="change-password-modal__input-wrap">
          <input
            id="cpm-current-password"
            class="change-password-modal__input"
            :class="{ 'change-password-modal__input--invalid': errors.currentPassword }"
            :type="currentPasswordFieldType"
            v-model="form.currentPassword"
            :disabled="isLoading"
            autocomplete="current-password"
            :placeholder="t('settings.changePassword.currentPlaceholder')"
          />
          <button
            type="button"
            class="change-password-modal__toggle"
            :disabled="isLoading"
            :title="isCurrentPasswordVisible ? t('settings.changePassword.hidePassword') : t('settings.changePassword.showPassword')"
            :aria-label="isCurrentPasswordVisible ? t('settings.changePassword.hidePassword') : t('settings.changePassword.showPassword')"
            @click="togglePasswordVisibility('currentPassword')"
          >
            <component :is="currentPasswordIcon" :size="18" aria-hidden="true" />
          </button>
        </div>
        <p v-if="errors.currentPassword" class="change-password-modal__error">{{ errors.currentPassword }}</p>
      </div>

      <div class="change-password-modal__grid">
        <div class="change-password-modal__field">
          <label class="change-password-modal__label" for="cpm-new-password">{{ t('settings.changePassword.new') }}</label>
          <div class="change-password-modal__input-wrap">
            <input
              id="cpm-new-password"
              class="change-password-modal__input"
              :class="{ 'change-password-modal__input--invalid': errors.newPassword }"
              :type="newPasswordFieldType"
              v-model="form.newPassword"
              :disabled="isLoading"
              autocomplete="new-password"
              :placeholder="t('settings.changePassword.newPlaceholder')"
            />
            <button
              type="button"
              class="change-password-modal__toggle"
              :disabled="isLoading"
              :title="isNewPasswordVisible ? t('settings.changePassword.hidePassword') : t('settings.changePassword.showPassword')"
              :aria-label="isNewPasswordVisible ? t('settings.changePassword.hidePassword') : t('settings.changePassword.showPassword')"
              @click="togglePasswordVisibility('newPassword')"
            >
              <component :is="newPasswordIcon" :size="18" aria-hidden="true" />
            </button>
          </div>
          <p v-if="errors.newPassword" class="change-password-modal__error">{{ errors.newPassword }}</p>

          <div v-if="form.newPassword && passwordStrength.score > 0" class="change-password-modal__strength">
            <div class="change-password-modal__strength-head">
              <span class="change-password-modal__strength-label">{{ t('settings.changePassword.strength') }}</span>
              <span
                class="change-password-modal__strength-value"
                :class="`change-password-modal__strength-value--${passwordStrength.tone}`"
              >
                {{ passwordStrength.label }}
              </span>
            </div>
            <div class="change-password-modal__strength-track">
              <div
                class="change-password-modal__strength-bar"
                :class="`change-password-modal__strength-bar--${passwordStrength.tone}`"
                :style="{ width: `${(passwordStrength.score / 6) * 100}%` }"
              />
            </div>
          </div>
        </div>

        <div class="change-password-modal__field">
          <label class="change-password-modal__label" for="cpm-confirm-password">{{ t('settings.changePassword.confirm') }}</label>
          <div class="change-password-modal__input-wrap">
            <input
              id="cpm-confirm-password"
              class="change-password-modal__input"
              :class="{ 'change-password-modal__input--invalid': errors.confirmPassword }"
              :type="confirmPasswordFieldType"
              v-model="form.confirmPassword"
              :disabled="isLoading"
              autocomplete="new-password"
              :placeholder="t('settings.changePassword.confirmPlaceholder')"
            />
            <button
              type="button"
              class="change-password-modal__toggle"
              :disabled="isLoading"
              :title="isConfirmPasswordVisible ? t('settings.changePassword.hidePassword') : t('settings.changePassword.showPassword')"
              :aria-label="isConfirmPasswordVisible ? t('settings.changePassword.hidePassword') : t('settings.changePassword.showPassword')"
              @click="togglePasswordVisibility('confirmPassword')"
            >
              <component :is="confirmPasswordIcon" :size="18" aria-hidden="true" />
            </button>
          </div>
          <p v-if="errors.confirmPassword" class="change-password-modal__error">{{ errors.confirmPassword }}</p>
          <p v-else-if="passwordsMatch" class="change-password-modal__match">
            <CheckCircle :size="14" />
            {{ t('settings.changePassword.match') }}
          </p>
        </div>
      </div>

      <div class="change-password-modal__requirements">
        <h2 class="change-password-modal__requirements-title">
          <Shield :size="16" />
          {{ t('settings.changePassword.requirements') }}
        </h2>
        <ul class="change-password-modal__requirements-list">
          <li v-for="hint in passwordRequirementHints" :key="hint">{{ hint }}</li>
        </ul>
      </div>
    </form>

    <template #footer>
      <button
        type="button"
        class="ui-btn ui-btn--secondary"
        :disabled="isLoading"
        @click="handleClose"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="submit"
        :form="formId"
        class="ui-btn ui-btn--primary"
        :disabled="isLoading"
      >
        <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
        <span>{{ isLoading ? t('settings.changePassword.saving') : t('common.save') }}</span>
      </button>
    </template>
  </ModalCenter>
</template>

<style scoped lang="scss">
.change-password-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.change-password-modal__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.change-password-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.875rem 1rem;

  @media (width < $ui-bp-md) {
    grid-template-columns: 1fr;
  }
}

.change-password-modal__label {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-secondary-text);
}

.change-password-modal__input-wrap {
  position: relative;
}

.change-password-modal__input {
  width: 100%;
  min-height: 2.125rem;
  padding: 0.375rem 2.5rem 0.375rem 0.625rem;
  font-size: 0.875rem;
  line-height: 1.4;
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
    box-shadow: none;
  }

  &:disabled {
    opacity: 0.65;
  }

  &--invalid {
    border-color: var(--bs-danger, #dc3545);
  }
}

.change-password-modal__toggle {
  position: absolute;
  top: 50%;
  right: 0.375rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-secondary-text);
  transform: translateY(-50%);

  &:hover:not(:disabled) {
    color: var(--color-primary-text);
    background: var(--color-hover-background);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--color-accent, #0d6efd) 45%, transparent);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.change-password-modal__error {
  margin: 0;
  font-size: 0.75rem;
  color: var(--bs-danger, #dc3545);
}

.change-password-modal__match {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  font-size: 0.75rem;
  color: var(--bs-success, #198754);
}

.change-password-modal__strength {
  margin-top: 0.125rem;
}

.change-password-modal__strength-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.change-password-modal__strength-label {
  font-size: 0.75rem;
  color: var(--color-secondary-text);
}

.change-password-modal__strength-value {
  font-size: 0.75rem;
  font-weight: 600;

  &--danger {
    color: var(--bs-danger, #dc3545);
  }

  &--warning {
    color: var(--bs-warning-text-emphasis, #997404);
  }

  &--info {
    color: var(--color-accent, #0d6efd);
  }

  &--success {
    color: var(--bs-success, #198754);
  }
}

.change-password-modal__strength-track {
  height: 0.25rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  background: var(--color-secondary-background);
  overflow: hidden;
}

.change-password-modal__strength-bar {
  height: 100%;
  border-radius: inherit;
  transition: width 0.15s ease;

  &--danger {
    background: var(--bs-danger, #dc3545);
  }

  &--warning {
    background: var(--bs-warning, #ffc107);
  }

  &--info {
    background: var(--color-accent, #0d6efd);
  }

  &--success {
    background: var(--bs-success, #198754);
  }
}

.change-password-modal__requirements {
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: $radius-usual;
  background: var(--color-secondary-background);
}

.change-password-modal__requirements-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary-text);
}

.change-password-modal__requirements-list {
  margin: 0;
  padding-left: 1.125rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--color-secondary-text);
}
</style>
