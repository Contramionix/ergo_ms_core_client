<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'
import { sendConfirmationCode, fetchPasswordResetSettings } from '@/core/cms/adp/js/auth-index'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { validateFieldValue, validateFieldWithRegex, emailRegex } from '@/js/validation'
import { prefetchRouteByName } from '@/js/utils/prefetchRoute.js'

const router = useRouter()
const { t } = useAppI18n()

function prefetchLogin() {
  prefetchRouteByName(router, 'Login')
}
const isLoading = ref(false)
const isSuccess = ref(false)
const isBootstrapping = ref(true)
const passwordResetSettings = ref({ password_reset_enabled: false })

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

const resolveEmailSendError = (error) => {
  const { message } = sanitizeError(error)
  return message || t('auth.forgot.sendFailed')
}

const validateForm = () => {
  errors.email = validateFieldValue(form.email, t('auth.login.email'))

  if (!errors.email) {
    errors.email = validateFieldWithRegex(form.email, emailRegex, t('auth.forgot.invalidEmail'))
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
          || t('auth.forgot.sendFailed')
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
        errors.email = t('auth.forgot.userNotFound')
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
      errors.general = t('auth.login.noConnection')
    } else {
      errors.general = t('auth.login.unknownError')
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
        <span class="visually-hidden">{{ t('common.loading') }}</span>
      </div>
    </div>

    <template v-else>
      <div class="auth-page__header">
        <h1 class="auth-page__title">{{ pageTitle }}</h1>
        <p class="auth-page__description">{{ pageDescription }}</p>
      </div>

      <div v-if="passwordResetDisabled" class="text-center">
        <div class="alert alert-warning" role="alert">
          <i class="bi bi-info-circle-fill me-2"></i>
          {{ t('auth.forgot.contactAdmin') }}
        </div>
        <button
          type="button"
          class="btn btn-outline-primary"
          @mouseenter="prefetchLogin"
          @focus="prefetchLogin"
          @click="goToLogin"
        >
          <i class="bi bi-arrow-left me-2"></i>
          {{ t('auth.forgot.backToLogin') }}
        </button>
      </div>

      <div v-else-if="isSuccess" class="text-center">
        <div class="alert alert-success" role="alert">
          <i class="bi bi-check-circle-fill me-2"></i>
          {{ t('auth.forgot.codeSentTo') }} <strong>{{ form.email }}</strong>
        </div>

        <p class="text-muted mb-4">
          {{ t('auth.forgot.checkInbox') }}
        </p>

        <button
          type="button"
          class="btn btn-outline-primary"
          @mouseenter="prefetchLogin"
          @focus="prefetchLogin"
          @click="goToLogin"
        >
          <i class="bi bi-arrow-left me-2"></i>
          {{ t('auth.forgot.backToLogin') }}
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
            <i class="bi bi-envelope me-2"></i>{{ t('auth.login.email') }}
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
          {{ isLoading ? t('auth.forgot.sending') : t('auth.forgot.sendCode') }}
        </button>

        <div class="text-center">
          <RouterLink
            :to="{ name: 'Login' }"
            class="text-decoration-none text-primary"
            @mouseenter="prefetchLogin"
            @focusin="prefetchLogin"
          >
            <i class="bi bi-arrow-left me-2"></i>
            {{ t('auth.forgot.backToLogin') }}
          </RouterLink>
        </div>
      </form>
    </template>
  </AuthPageShell>
</template>
