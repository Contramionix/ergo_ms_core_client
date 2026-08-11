<script setup>
import { reactive, ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'
import { sendConfirmationCode, fetchPasswordResetSettings } from '@/core/cms/adp/js/auth-index'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { validateFieldValue, validateFieldWithRegex, emailRegex } from '@/js/validation'
import { logError, sanitizeError } from '@/js/utils/logError.js'
import { prefetchRouteByName } from '@/js/utils/prefetchRoute.js'

const router = useRouter()
const { t } = useAppI18n()

function prefetchLogin() {
  prefetchRouteByName(router, 'Login')
}

const emailInputRef = ref(null)
const isLoading = ref(false)
const isSuccess = ref(false)
const isBootstrapping = ref(true)
const emailTouched = ref(false)
const passwordResetSettings = ref({
  password_reset_enabled: false,
  email_delivery_ready: false,
  password_reset_available: false,
})

const form = reactive({
  email: '',
})

const errors = reactive({
  email: null,
})

const passwordResetDisabled = computed(
  () => passwordResetSettings.value.password_reset_available !== true,
)

const pageTitle = computed(() => (
  passwordResetDisabled.value ? t('auth.forgot.titleDisabled') : t('auth.forgot.title')
))

const pageDescription = computed(() => {
  if (isSuccess.value) {
    return t('auth.forgot.descriptionSent')
  }
  if (passwordResetDisabled.value) {
    return t('auth.forgot.descriptionDisabled')
  }
  return t('auth.forgot.description')
})

const emailDescribedBy = computed(() => {
  if (errors.email) {
    return 'forgot-email-error'
  }
  return 'forgot-email-hint'
})

const isTechnicalErrorMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return true
  }
  return (
    message === 'Ошибка сервера'
    || message === 'Неизвестная ошибка'
    || /^Request failed with status code/i.test(message)
    || /^Network Error/i.test(message)
    || /^timeout/i.test(message)
  )
}

/** Одна строка под полем — без отдельного alert-баннера. */
const resolveEmailSendError = (error) => {
  const { message, status } = sanitizeError(error)
  if (status === 403) {
    return t('auth.forgot.sendFailedAdminHint')
  }
  if (status === 429) {
    return t('errors.api.tooManyRequests')
  }
  if (!isTechnicalErrorMessage(message)) {
    return message
  }
  return t('auth.forgot.sendFailed')
}

const setEmailError = (message) => {
  errors.email = message
}

const clearEmailError = () => {
  errors.email = null
}

const validateEmailField = ({ requireValue = true } = {}) => {
  const trimmed = form.email.trim()

  if (!trimmed) {
    errors.email = requireValue
      ? validateFieldValue(form.email, t('auth.login.email'))
      : null
    return !errors.email
  }

  errors.email = validateFieldWithRegex(form.email, emailRegex, t('auth.forgot.invalidEmail'))
  return !errors.email
}

const validateForm = () => {
  emailTouched.value = true
  return validateEmailField({ requireValue: true })
}

const focusEmailField = async () => {
  await nextTick()
  emailInputRef.value?.focus?.()
}

const onEmailInput = () => {
  if (errors.email && emailTouched.value) {
    validateEmailField({ requireValue: false })
  }
}

const onEmailBlur = () => {
  emailTouched.value = true
  validateEmailField({ requireValue: Boolean(form.email.trim()) })
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
    await focusEmailField()
    return
  }

  isLoading.value = true
  clearEmailError()

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
        setEmailError(Array.isArray(apiErrors.email)
          ? apiErrors.email[0]
          : apiErrors.email)
      } else {
        const detail = result.message
          || apiErrors?.detail
          || apiErrors?.error
        setEmailError(isTechnicalErrorMessage(detail)
          ? t('auth.forgot.sendFailed')
          : (detail || t('auth.forgot.sendFailed')))
      }
      await focusEmailField()
    }
  } catch (error) {
    // Сначала UI-ошибка, потом лог — иначе сбой logError стирает сообщение до finally.
    if (error.response?.status === 404) {
      setEmailError(t('auth.forgot.userNotFound'))
    } else if (error.response?.status === 400) {
      const errorData = error.response.data
      if (errorData?.email) {
        setEmailError(Array.isArray(errorData.email)
          ? errorData.email[0]
          : errorData.email)
      } else {
        setEmailError(resolveEmailSendError(error))
      }
    } else if (error.response) {
      setEmailError(resolveEmailSendError(error))
    } else if (error.request) {
      setEmailError(t('auth.login.noConnection'))
    } else {
      setEmailError(t('auth.login.unknownError'))
    }

    await focusEmailField()
    logError('Forgot password error:', error)
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
        <span class="visually-hidden">{{ t('common.loading') }}</span>
      </div>
    </div>

    <template v-else>
      <div class="auth-page__header">
        <h1 class="auth-page__title">{{ pageTitle }}</h1>
        <p class="auth-page__description">{{ pageDescription }}</p>
      </div>

      <div v-if="passwordResetDisabled" class="text-center">
        <div class="alert alert-warning auth-page__alert" role="alert">
          <i class="bi bi-info-circle-fill me-2" aria-hidden="true"></i>
          {{ t('auth.forgot.contactAdmin') }}
        </div>
        <button
          type="button"
          class="btn btn-outline-primary"
          @mouseenter="prefetchLogin"
          @focus="prefetchLogin"
          @click="goToLogin"
        >
          <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>
          {{ t('auth.forgot.backToLogin') }}
        </button>
      </div>

      <div v-else-if="isSuccess" class="text-center">
        <div class="alert alert-success auth-page__alert" role="alert">
          <i class="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
          {{ t('auth.forgot.codeSentTo') }} <strong>{{ form.email }}</strong>
        </div>

        <p class="text-muted mb-3">
          {{ t('auth.forgot.checkInbox') }}
        </p>

        <button
          type="button"
          class="btn btn-outline-primary"
          @mouseenter="prefetchLogin"
          @focus="prefetchLogin"
          @click="goToLogin"
        >
          <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>
          {{ t('auth.forgot.backToLogin') }}
        </button>
      </div>

      <form
        v-else
        @submit.prevent="submitForm"
        novalidate
        :aria-busy="isLoading ? 'true' : 'false'"
      >
        <div class="mb-3" v-auto-animate>
          <div class="form-floating">
            <input
              ref="emailInputRef"
              type="email"
              id="forgot-email"
              class="form-control"
              :class="{ 'is-invalid': errors.email }"
              v-model="form.email"
              placeholder="email@example.com"
              :disabled="isLoading"
              autocomplete="email"
              inputmode="email"
              spellcheck="false"
              :aria-invalid="errors.email ? 'true' : 'false'"
              :aria-describedby="emailDescribedBy"
              @input="onEmailInput"
              @blur="onEmailBlur"
            />
            <label for="forgot-email">
              <i class="bi bi-envelope me-2" aria-hidden="true"></i>{{ t('auth.login.email') }}
            </label>
          </div>
          <div
            v-if="errors.email"
            id="forgot-email-error"
            class="invalid-feedback d-block"
            role="alert"
          >
            {{ errors.email }}
          </div>
          <div
            v-else
            id="forgot-email-hint"
            class="form-text auth-page__field-hint"
          >
            {{ t('auth.forgot.emailHint') }}
          </div>
        </div>

        <button
          type="submit"
          class="btn btn-primary w-100 py-3 mb-3"
          :disabled="isLoading"
          :aria-busy="isLoading ? 'true' : 'false'"
        >
          <span
            v-if="isLoading"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          <i v-else class="bi bi-envelope-arrow-up me-2" aria-hidden="true"></i>
          {{ isLoading ? t('auth.forgot.sending') : t('auth.forgot.sendCode') }}
        </button>

        <div class="text-center">
          <RouterLink
            :to="{ name: 'Login' }"
            class="auth-page__back-link text-decoration-none text-muted"
            @mouseenter="prefetchLogin"
            @focusin="prefetchLogin"
          >
            <i class="bi bi-arrow-left me-2" aria-hidden="true"></i>
            {{ t('auth.forgot.backToLogin') }}
          </RouterLink>
        </div>
      </form>
    </template>
  </AuthPageShell>
</template>
