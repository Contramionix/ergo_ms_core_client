<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'
import { sendConfirmationCode, fetchPasswordResetSettings } from '@/core/cms/adp/js/auth-index'
import { validateFieldValue, validateFieldWithRegex, emailRegex } from '@/js/validation'

const router = useRouter()
const isLoading = ref(false)
const isSuccess = ref(false)
const isBootstrapping = ref(true)
const passwordResetSettings = ref({ password_reset_enabled: true })

const form = reactive({
  email: '',
})

const errors = reactive({
  email: null,
  general: null,
})

const passwordResetDisabled = computed(
  () => passwordResetSettings.value.password_reset_enabled === false,
)

const pageTitle = computed(() => (
  passwordResetDisabled.value ? 'Восстановление недоступно' : 'Восстановление пароля'
))

const pageDescription = computed(() => {
  if (isSuccess.value) {
    return 'Код восстановления отправлен на ваш email'
  }
  if (passwordResetDisabled.value) {
    return 'Самостоятельное восстановление пароля отключено администратором.'
  }
  return 'Введите email для получения кода восстановления'
})

const resolveEmailSendError = (error) => {
  const { message } = sanitizeError(error)
  return message || 'Не удалось отправить письмо с кодом восстановления'
}

const validateForm = () => {
  errors.email = validateFieldValue(form.email, 'Email')

  if (!errors.email) {
    errors.email = validateFieldWithRegex(form.email, emailRegex, 'Введите корректный email')
  }

  errors.general = null
  return !errors.email
}

onMounted(async () => {
  try {
    passwordResetSettings.value = await fetchPasswordResetSettings()
  } finally {
    isBootstrapping.value = false
  }
})

const submitForm = async () => {
  if (passwordResetDisabled.value || !validateForm()) {
    return
  }

  isLoading.value = true
  errors.general = null

  try {
    const result = await sendConfirmationCode(form.email, 'password_reset')

    if (result.success) {
      isSuccess.value = true
      setTimeout(() => {
        router.push({
          name: 'ResetPassword',
          query: { email: form.email },
        })
      }, 2000)
    } else {
      const apiErrors = result.errors
      if (apiErrors?.email) {
        errors.email = Array.isArray(apiErrors.email)
          ? apiErrors.email[0]
          : apiErrors.email
      } else {
        errors.general = result.message
          || apiErrors?.detail
          || apiErrors?.error
          || 'Не удалось отправить письмо с кодом восстановления'
      }
    }
  } catch (error) {
    logError('Forgot password error:', error)

    if (error.response?.status === 403) {
      errors.general = resolveEmailSendError(error)
      return
    }

    if (error.response) {
      if (error.response.status === 404) {
        errors.email = 'Пользователь с таким email не найден'
      } else if (error.response.status === 400) {
        const errorData = error.response.data
        if (errorData?.email) {
          errors.email = Array.isArray(errorData.email)
            ? errorData.email[0]
            : errorData.email
        } else {
          errors.general = resolveEmailSendError(error)
        }
      } else if (error.response.status >= 500) {
        errors.general = resolveEmailSendError(error)
      } else {
        errors.general = resolveEmailSendError(error)
      }
    } else if (error.request) {
      errors.general = 'Нет соединения с сервером'
    } else {
      errors.general = 'Произошла неизвестная ошибка'
    }
  } finally {
    isLoading.value = false
  }
}

const goToLogin = () => {
  router.push({ name: 'Login' })
}
</script>

<template>
  <AuthPageShell>
    <div v-if="isBootstrapping" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>

    <template v-else>
      <div class="auth-page__header">
        <h2 class="auth-page__title">{{ pageTitle }}</h2>
        <p class="auth-page__description">{{ pageDescription }}</p>
      </div>

          <div v-if="passwordResetDisabled" class="text-center">
            <div class="alert alert-warning" role="alert">
              <i class="bi bi-info-circle-fill me-2"></i>
              Обратитесь к администратору системы для восстановления доступа.
            </div>
            <button type="button" class="btn btn-outline-primary" @click="goToLogin">
              <i class="bi bi-arrow-left me-2"></i>
              Вернуться к входу
            </button>
          </div>

          <div v-else-if="isSuccess" class="text-center">
            <div class="alert alert-success" role="alert">
              <i class="bi bi-check-circle-fill me-2"></i>
              Код восстановления отправлен на <strong>{{ form.email }}</strong>
            </div>

            <p class="text-muted mb-4">
              Проверьте свою почту и следуйте инструкциям для восстановления пароля.
              Если письмо не пришло, проверьте папку «Спам».
            </p>

            <button type="button" class="btn btn-outline-primary" @click="goToLogin">
              <i class="bi bi-arrow-left me-2"></i>
              Вернуться к входу
            </button>
          </div>

          <form v-else @submit.prevent="submitForm" novalidate>
            <div v-if="errors.general" class="alert alert-danger" role="alert">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              {{ errors.general }}
            </div>

            <div class="form-floating mb-4" v-auto-animate>
              <input
                type="email"
                id="email"
                class="form-control"
                :class="{ 'is-invalid': errors.email }"
                v-model="form.email"
                placeholder="email@example.com"
                :disabled="isLoading"
                autocomplete="email"
              />
              <label for="email">
                <i class="bi bi-envelope me-2"></i>Email
              </label>
              <div v-if="errors.email" class="invalid-feedback">
                {{ errors.email }}
              </div>
            </div>

            <button type="submit" class="btn btn-primary w-100 py-3 mb-3" :disabled="isLoading">
              <span
                v-if="isLoading"
                class="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              <i v-else class="bi bi-envelope-arrow-up me-2"></i>
              {{ isLoading ? 'Отправка...' : 'Отправить код восстановления' }}
            </button>

            <div class="text-center">
              <RouterLink :to="{ name: 'Login' }" class="text-decoration-none text-primary">
                <i class="bi bi-arrow-left me-2"></i>
                Вернуться к входу
              </RouterLink>
            </div>
          </form>
    </template>
  </AuthPageShell>
</template>
