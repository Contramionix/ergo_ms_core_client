<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PasswordInput from '@/core/cms/adp/components/PasswordInput.vue'
import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { validateFieldValue, validateFieldsOnEquality } from '@/js/validation'
import { validatePasswordValue } from '@/js/passwordPolicy.js'
import { resetPassword, fetchPasswordResetSettings } from '@/core/cms/adp/js/auth-index'
import { logError, sanitizeError } from '@/js/utils/logError.js'
import { prefetchRouteByName } from '@/js/utils/prefetchRoute.js'

const router = useRouter()
const route = useRoute()
const { t } = useAppI18n()

function prefetchLogin() {
  prefetchRouteByName(router, 'Login')
}
const isLoading = ref(false)
const isSuccess = ref(false)
const isBootstrapping = ref(true)
const passwordResetSettings = ref({
  password_reset_enabled: false,
  email_delivery_ready: false,
  password_reset_available: false,
})

const form = reactive({
  email: '',
  code: '',
  password: '',
  passwordConfirm: '',
})

const errors = reactive({
  code: null,
  password: null,
  passwordConfirm: null,
  general: null,
})

const passwordResetDisabled = computed(
  () => passwordResetSettings.value.password_reset_available !== true,
)

onMounted(async () => {
  try {
    passwordResetSettings.value = await fetchPasswordResetSettings()
  } finally {
    isBootstrapping.value = false
  }

  if (route.query.email) {
    form.email = route.query.email
  }
  if (route.query.code) {
    form.code = route.query.code
  }
})

const validateForm = () => {
  errors.code = validateFieldValue(form.code, t('auth.validation.confirmationCode'))
  errors.password = validateFieldValue(form.password, t('auth.validation.newPassword'))
  errors.passwordConfirm = validateFieldValue(
    form.passwordConfirm,
    t('auth.validation.passwordConfirm'),
  )

  if (!errors.password) {
    const passwordComplexityError = validatePasswordValue(form.password)
    if (passwordComplexityError) {
      errors.password = passwordComplexityError
    }
  }

  if (!errors.password && !errors.passwordConfirm) {
    const { firstFieldError, secondFieldError } = validateFieldsOnEquality(
      form.password,
      form.passwordConfirm,
      t('auth.password.passwordsMismatch'),
    )
    errors.password = firstFieldError
    errors.passwordConfirm = secondFieldError
  }

  errors.general = null
  return !errors.code && !errors.password && !errors.passwordConfirm
}

const submitForm = async () => {
  if (passwordResetDisabled.value || !validateForm()) {
    return
  }

  isLoading.value = true
  errors.general = null

  try {
    const result = await resetPassword(
      form.email,
      form.code,
      form.password,
      form.passwordConfirm,
    )

    if (result && result.success) {
      isSuccess.value = true
      setTimeout(() => {
        router.push({ name: 'Login' })
      }, 2000)
    } else {
      if (result && result.errors) {
        if (result.errors.error) {
          const errorMsg = Array.isArray(result.errors.error)
            ? result.errors.error[0]
            : result.errors.error

          if (errorMsg.includes('код') || errorMsg.includes('Код') || /code/i.test(errorMsg)) {
            errors.code = errorMsg
          } else if (errorMsg.includes('пароль') || errorMsg.includes('Пароль') || /password/i.test(errorMsg)) {
            errors.password = errorMsg
          } else {
            errors.general = errorMsg
          }
        } else if (result.errors.code) {
          errors.code = Array.isArray(result.errors.code)
            ? result.errors.code[0]
            : result.errors.code
        } else if (result.errors.password) {
          errors.password = Array.isArray(result.errors.password)
            ? result.errors.password[0]
            : result.errors.password
        }
      } else if (result && result.message) {
        errors.general = result.message
      } else if (result && result.error) {
        errors.general = Array.isArray(result.error)
          ? result.error[0]
          : result.error
      } else {
        errors.general = t('auth.reset.changeFailed')
      }
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 400) {
        const errorData = error.response.data
        if (errorData && errorData.error) {
          const errorMsg = Array.isArray(errorData.error)
            ? errorData.error[0]
            : errorData.error

          if (errorMsg.includes('код') || errorMsg.includes('Код') || /code/i.test(errorMsg)) {
            errors.code = errorMsg
          } else if (errorMsg.includes('пароль') || errorMsg.includes('Пароль') || /password/i.test(errorMsg)) {
            errors.password = errorMsg
          } else {
            errors.general = errorMsg
          }
        } else if (errorData && errorData.code) {
          errors.code = Array.isArray(errorData.code)
            ? errorData.code[0]
            : errorData.code
        } else if (errorData && errorData.password) {
          errors.password = Array.isArray(errorData.password)
            ? errorData.password[0]
            : errorData.password
        } else {
          errors.general = errorData?.detail || errorData?.message || t('auth.reset.invalidCodeOrData')
        }
      } else if (error.response.status === 403) {
        errors.general = sanitizeError(error).message
          || t('auth.reset.resetDisabled')
      } else if (error.response.status >= 500) {
        errors.general = error.response.data?.detail || error.response.data?.error || t('auth.login.serverError')
      } else {
        errors.general = error.response.data?.error || error.response.data?.message || t('auth.reset.resetError')
      }
    } else if (error.request) {
      errors.general = t('auth.login.noConnection')
    } else {
      errors.general = error.message || t('auth.login.unknownError')
    }

    logError('Ошибка сброса пароля', error)
  } finally {
    isLoading.value = false
  }
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
        <h1 class="auth-page__title">
          {{
            isSuccess
              ? t('auth.reset.titleSuccess')
              : passwordResetDisabled
                ? t('auth.reset.titleDisabled')
                : t('auth.reset.title')
          }}
        </h1>
        <p class="auth-page__description">
          {{
            isSuccess
              ? t('auth.reset.descriptionSuccess')
              : passwordResetDisabled
                ? t('auth.reset.descriptionDisabled')
                : t('auth.reset.description')
          }}
        </p>
      </div>

      <div v-if="passwordResetDisabled" class="text-center">
        <div class="alert alert-warning" role="alert">
          <i class="bi bi-info-circle-fill me-2"></i>
          {{ t('auth.forgot.contactAdmin') }}
        </div>
        <RouterLink
          :to="{ name: 'Login' }"
          class="btn btn-outline-primary"
          @mouseenter="prefetchLogin"
          @focusin="prefetchLogin"
        >
          <i class="bi bi-arrow-left me-2"></i>
          {{ t('auth.forgot.backToLogin') }}
        </RouterLink>
      </div>

      <div v-else-if="isSuccess" class="text-center">
        <div class="alert alert-success" role="alert">
          <i class="bi bi-check-circle-fill me-2"></i>
          {{ t('auth.reset.successAlert') }}
        </div>

        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ t('common.loading') }}</span>
        </div>
        <p class="text-muted mt-2">{{ t('auth.reset.redirecting') }}</p>
      </div>

      <form v-else @submit.prevent="submitForm" novalidate>
        <div v-if="errors.general" class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          {{ errors.general }}
        </div>

        <div class="form-floating mb-3">
          <input
            type="email"
            id="email"
            class="form-control"
            v-model="form.email"
            placeholder="email@example.com"
            readonly
          />
          <label for="email">
            <i class="bi bi-envelope me-2"></i>{{ t('auth.login.email') }}
          </label>
        </div>

        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="text"
            id="code"
            class="form-control"
            :class="{ 'is-invalid': errors.code }"
            v-model="form.code"
            :placeholder="t('auth.password.confirmationCode')"
            :disabled="isLoading"
            maxlength="6"
          />
          <label for="code">
            <i class="bi bi-shield-check me-2"></i>{{ t('auth.password.confirmationCode') }}
          </label>
          <div v-if="errors.code" class="invalid-feedback">
            {{ errors.code }}
          </div>
        </div>

        <PasswordInput
          id="password"
          v-model="form.password"
          :error="errors.password"
          :label="t('auth.password.new')"
          :placeholder="t('auth.password.new')"
          autocomplete="new-password"
          :disabled="isLoading"
          class="mb-3"
        />

        <PasswordInput
          id="passwordConfirm"
          v-model="form.passwordConfirm"
          :error="errors.passwordConfirm"
          :label="t('auth.password.confirmPlaceholder')"
          :placeholder="t('auth.password.confirmPlaceholder')"
          autocomplete="new-password"
          icon="bi-lock-fill"
          :disabled="isLoading"
          class="mb-4"
        />

        <button type="submit" class="btn btn-primary w-100 py-3 mb-3" :disabled="isLoading">
          <span
            v-if="isLoading"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          <i v-else class="bi bi-shield-check me-2"></i>
          {{ isLoading ? t('auth.reset.submitting') : t('auth.reset.submit') }}
        </button>

        <div class="text-center">
          <RouterLink
            :to="{ name: 'Login' }"
            class="auth-page__back-link text-decoration-none text-primary"
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
