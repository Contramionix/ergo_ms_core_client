<script setup>
import { computed, ref, watch } from 'vue'
import { Eye, EyeOff, CheckCircle, Shield } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ModalCenter from '@/components/ModalCenter.vue'
import { useProfile } from '@/core/cms/js/profileService.js'

const props = defineProps({
  show: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const toast = useToast()
const { changePassword } = useProfile()

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

const passwordStrength = computed(() => {
  const password = form.value.newPassword
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  const strengthMap = {
    0: { label: '', color: '' },
    1: { label: 'Очень слабый', color: 'danger' },
    2: { label: 'Слабый', color: 'warning' },
    3: { label: 'Слабый', color: 'warning' },
    4: { label: 'Средний', color: 'info' },
    5: { label: 'Сильный', color: 'success' },
    6: { label: 'Очень сильный', color: 'success' },
  }

  return { score, ...strengthMap[score] }
})

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
    errors.value.currentPassword = 'Введите текущий пароль'
    isValid = false
  }

  if (form.value.newPassword.length < 8) {
    errors.value.newPassword = 'Пароль должен содержать минимум 8 символов'
    isValid = false
  } else if (!/[a-z]/.test(form.value.newPassword)) {
    errors.value.newPassword = 'Пароль должен содержать хотя бы одну букву в нижнем регистре'
    isValid = false
  } else if (!/[0-9]/.test(form.value.newPassword)) {
    errors.value.newPassword = 'Пароль должен содержать хотя бы одну цифру'
    isValid = false
  }

  if (form.value.newPassword !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Пароли не совпадают'
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

const submitForm = async (event) => {
  event.preventDefault()

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
    toast.success('Пароль успешно изменён')
    handleClose()
  } catch (error) {
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
      toast.error('Ошибка при смене пароля')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="cpm-backdrop">
      <div v-if="show" class="change-password-modal-backdrop" @click="handleClose"></div>
    </Transition>
    <Transition name="cpm-dialog" appear>
      <ModalCenter
        v-if="show"
        modal-id="changePasswordModal"
        title="Изменить пароль"
        modal-aria-label="Изменить пароль"
        :show-footer="false"
        custom-class="show d-block change-password-modal-root"
        dialog-class="modal-dialog-centered modal-lg"
        body-class="p-3 change-password-modal-body"
        @closemodal="handleClose"
      >
        <form @submit="submitForm">
          <div class="mb-3">
            <label class="form-label" for="cpm-current-password">Текущий пароль</label>
            <div class="input-group">
              <input
                id="cpm-current-password"
                class="form-control"
                :class="{ 'is-invalid': errors.currentPassword }"
                :type="currentPasswordFieldType"
                v-model="form.currentPassword"
                :disabled="isLoading"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="isLoading"
                @click="togglePasswordVisibility('currentPassword')"
              >
                <component :is="currentPasswordIcon" :size="18" />
              </button>
              <div v-if="errors.currentPassword" class="invalid-feedback d-block">
                {{ errors.currentPassword }}
              </div>
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label" for="cpm-new-password">Новый пароль</label>
              <div class="input-group">
                <input
                  id="cpm-new-password"
                  class="form-control"
                  :class="{ 'is-invalid': errors.newPassword }"
                  :type="newPasswordFieldType"
                  v-model="form.newPassword"
                  :disabled="isLoading"
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="isLoading"
                  @click="togglePasswordVisibility('newPassword')"
                >
                  <component :is="newPasswordIcon" :size="18" />
                </button>
              </div>
              <div v-if="errors.newPassword" class="invalid-feedback d-block">{{ errors.newPassword }}</div>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="cpm-confirm-password">Подтвердите новый пароль</label>
              <div class="input-group">
                <input
                  id="cpm-confirm-password"
                  class="form-control"
                  :class="{ 'is-invalid': errors.confirmPassword }"
                  :type="confirmPasswordFieldType"
                  v-model="form.confirmPassword"
                  :disabled="isLoading"
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="isLoading"
                  @click="togglePasswordVisibility('confirmPassword')"
                >
                  <component :is="confirmPasswordIcon" :size="18" />
                </button>
              </div>
              <div v-if="errors.confirmPassword" class="invalid-feedback d-block">
                {{ errors.confirmPassword }}
              </div>
            </div>
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <div v-if="form.newPassword && passwordStrength.score > 0" class="mb-2">
                <div class="d-flex align-items-center justify-content-between">
                  <small class="text-muted">Сила пароля:</small>
                  <span :class="`text-${passwordStrength.color}`" class="small fw-semibold">
                    {{ passwordStrength.label }}
                  </span>
                </div>
                <div class="progress mt-1" style="height: 4px">
                  <div
                    class="progress-bar"
                    :class="`bg-${passwordStrength.color}`"
                    :style="{ width: `${(passwordStrength.score / 6) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div
                v-if="form.confirmPassword && form.newPassword && form.confirmPassword === form.newPassword"
                class="mb-2"
              >
                <small class="text-success">
                  <CheckCircle :size="14" class="me-1" />
                  Пароли совпадают
                </small>
              </div>
            </div>
          </div>

          <div class="alert alert-info small mb-3">
            <h6 class="alert-heading mb-2 d-flex align-items-center gap-1">
              <Shield :size="16" />
              Требования к паролю
            </h6>
            <ul class="mb-0 ps-3">
              <li>Минимум 8 символов</li>
              <li>Хотя бы одна строчная буква</li>
              <li>Хотя бы одна цифра</li>
            </ul>
          </div>

          <div class="d-flex gap-2 justify-content-end">
            <button type="button" class="btn btn-light" :disabled="isLoading" @click="handleClose">
              Отмена
            </button>
            <button type="submit" class="btn btn-primary" :disabled="isLoading">
              <span
                v-if="isLoading"
                class="spinner-border spinner-border-sm me-2"
                role="status"
              ></span>
              {{ isLoading ? 'Сохранение...' : 'Сохранить' }}
            </button>
          </div>
        </form>
      </ModalCenter>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.input-group .btn {
  border-color: var(--color-border, #ced4da);
}
</style>

<style lang="scss">
.change-password-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1060;
}

.change-password-modal-root.modal {
  z-index: 1065;
  transition: none !important;
}

.cpm-backdrop-enter-active,
.cpm-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.cpm-backdrop-enter-from,
.cpm-backdrop-leave-to {
  opacity: 0;
}

.cpm-dialog-enter-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.cpm-dialog-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.cpm-dialog-enter-from,
.cpm-dialog-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
