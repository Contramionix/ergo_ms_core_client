<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'
import { registration, fetchRegistrationSettings, validateInvitationToken } from '@/core/cms/adp/js/auth-index'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { validateRegistrationForm } from '@/js/validation'
import { prefetchRouteByName } from '@/js/utils/prefetchRoute.js'
import { logError } from '@/js/utils/logError'

const router = useRouter()
const route = useRoute()
const { t } = useAppI18n()

function prefetchLogin() {
  prefetchRouteByName(router, 'Login')
}
const isLoading = ref(false)
const isSuccess = ref(false)
const isBootstrapping = ref(true)
const registrationSettings = ref({
  mode: 'open',
  registration_enabled: true,
  invitation_required: false,
})
const invitationToken = ref('')
const invitationStatus = ref(null)
const inviteCodeInput = ref('')
const isValidatingInvite = ref(false)
const inviteCodeError = ref(null)

const form = reactive({
  firstName: '',
  lastName: '',
  middleName: '',
  login: '',
  email: '',
  password: '',
  passwordConfirm: '',
})

const errors = reactive({
  firstName: null,
  lastName: null,
  middleName: null,
  login: null,
  email: null,
  password: null,
  passwordConfirm: null,
  general: null,
})

const registrationClosed = computed(() => !registrationSettings.value.registration_enabled)
const invitationRequired = computed(() => registrationSettings.value.invitation_required)
const invitationValid = computed(() => invitationStatus.value?.valid === true)
const emailLocked = computed(() => invitationRequired.value && invitationValid.value)

const pageTitle = computed(() => {
  if (isSuccess.value) return t('auth.register.titleDone')
  if (registrationClosed.value) return t('auth.register.titleClosed')
  if (invitationRequired.value && !invitationValid.value) return t('auth.register.titleInviteRequired')
  return t('auth.register.title')
})

const pageDescription = computed(() => {
  if (isSuccess.value) {
    return t('auth.register.descriptionDone')
  }
  if (registrationClosed.value) {
    return t('auth.register.descriptionClosed')
  }
  if (invitationRequired.value && !invitationValid.value) {
    return t('auth.register.descriptionInviteCode')
  }
  if (invitationRequired.value && invitationValid.value) {
    return t('auth.register.descriptionInviteFor', { email: invitationStatus.value.email })
  }
  return t('auth.register.subtitle')
})

const canShowForm = computed(() => {
  return !isSuccess.value
    && !registrationClosed.value
    && (!invitationRequired.value || invitationValid.value)
})

function inviteFromLocation() {
  const fromQuery = (route.query.invite || '').toString().trim()
  if (fromQuery) {
    return fromQuery
  }
  const rawHash = (window.location.hash || '').replace(/^#/, '')
  if (!rawHash) {
    return ''
  }
  return (new URLSearchParams(rawHash).get('invite') || '').trim()
}

function stripInviteFromAddress() {
  const nextQuery = { ...route.query }
  const hadQueryInvite = Object.prototype.hasOwnProperty.call(nextQuery, 'invite')
  if (hadQueryInvite) {
    delete nextQuery.invite
  }
  const hadHashInvite = Boolean((window.location.hash || '').includes('invite='))
  if (hadQueryInvite || hadHashInvite) {
    router.replace({ query: nextQuery, hash: '' })
  }
}

onMounted(async () => {
  try {
    registrationSettings.value = await fetchRegistrationSettings()
    invitationToken.value = inviteFromLocation()
    inviteCodeInput.value = invitationToken.value
    if (invitationToken.value) {
      stripInviteFromAddress()
    }

    if (registrationSettings.value.invitation_required && invitationToken.value) {
      await applyInvitationToken(invitationToken.value)
    }
  } catch (error) {
    logError('Registration bootstrap error:', error)
    errors.general = t('auth.register.settingsLoadError')
  } finally {
    isBootstrapping.value = false
  }
})

async function applyInvitationToken(token) {
  const normalized = (token || '').toString().trim()
  inviteCodeError.value = null
  if (!normalized) {
    inviteCodeError.value = t('auth.register.inviteCodeRequired')
    return
  }
  isValidatingInvite.value = true
  try {
    invitationToken.value = normalized
    invitationStatus.value = await validateInvitationToken(normalized)
    if (invitationStatus.value?.valid && invitationStatus.value.email) {
      form.email = invitationStatus.value.email
    } else {
      inviteCodeError.value = invitationStatus.value?.message
        || t('auth.invite.invalid')
    }
  } catch (error) {
    logError('Invitation validate error:', error)
    inviteCodeError.value = error.response?.status === 429
      ? t('errors.api.tooManyRequests')
      : t('auth.invite.invalid')
    invitationStatus.value = { valid: false }
  } finally {
    isValidatingInvite.value = false
  }
}

async function submitInviteCode() {
  await applyInvitationToken(inviteCodeInput.value)
}

const validateForm = () => {
  errors.firstName = !form.firstName || !form.firstName.trim()
    ? t('auth.register.firstNameRequired')
    : null
  errors.lastName = !form.lastName || !form.lastName.trim()
    ? t('auth.register.lastNameRequired')
    : null
  errors.middleName = null

  const validationErrors = validateRegistrationForm(
    form.firstName,
    form.login,
    form.email,
    form.password,
    form.passwordConfirm,
  )

  Object.keys(validationErrors).forEach((key) => {
    if (key === 'name') {
      errors.firstName = validationErrors[key] || errors.firstName
    } else if (key !== 'name') {
      errors[key] = validationErrors[key]
    }
  })

  errors.general = null

  const hasErrors = errors.firstName || errors.lastName || errors.login || errors.email
    || errors.password || errors.passwordConfirm

  return !hasErrors
}

const submitForm = async () => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true
  errors.general = null

  try {
    const registrationResult = await registration(
      form.firstName,
      form.lastName,
      form.middleName,
      form.login,
      form.email,
      form.password,
      invitationToken.value,
    )

    if (registrationResult.success) {
      showSuccessMessage()

      setTimeout(() => {
        router.push({ name: 'Login' })
      }, 1000)
    } else {
      handleServerErrors(registrationResult.errors)
    }
  } catch (error) {
    logError('Registration error:', error)

    if (error.response) {
      if (error.response.status === 400) {
        const errorData = error.response.data
        handleServerErrors(errorData)
      } else if (error.response.status === 429) {
        errors.general = t('errors.api.tooManyRequests')
      } else if (error.response.status >= 500) {
        errors.general = t('auth.login.serverError')
      } else {
        errors.general = t('auth.login.connectionError')
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

const handleServerErrors = (serverErrors) => {
  if (!serverErrors) {
    errors.general = t('auth.register.registrationError')
    return
  }

  Object.keys(errors).forEach((key) => {
    if (key !== 'general') errors[key] = null
  })

  if (typeof serverErrors === 'string') {
    errors.general = serverErrors
    return
  }

  if (serverErrors.first_name) {
    errors.firstName = Array.isArray(serverErrors.first_name)
      ? serverErrors.first_name[0]
      : serverErrors.first_name
  }

  if (serverErrors.last_name) {
    errors.lastName = Array.isArray(serverErrors.last_name)
      ? serverErrors.last_name[0]
      : serverErrors.last_name
  }

  if (serverErrors.middle_name) {
    errors.middleName = Array.isArray(serverErrors.middle_name)
      ? serverErrors.middle_name[0]
      : serverErrors.middle_name
  }

  if (serverErrors.username) {
    errors.login = Array.isArray(serverErrors.username)
      ? serverErrors.username[0]
      : serverErrors.username
  }

  if (serverErrors.email) {
    errors.email = Array.isArray(serverErrors.email)
      ? serverErrors.email[0]
      : serverErrors.email
  }

  if (serverErrors.password) {
    errors.password = Array.isArray(serverErrors.password)
      ? serverErrors.password[0]
      : serverErrors.password
  }

  if (serverErrors.invitation_token) {
    errors.general = Array.isArray(serverErrors.invitation_token)
      ? serverErrors.invitation_token[0]
      : serverErrors.invitation_token
  }

  if (serverErrors.message || serverErrors.detail) {
    errors.general = serverErrors.message || serverErrors.detail
  }

  const hasFieldErrors = errors.firstName || errors.lastName || errors.middleName
    || errors.login || errors.email || errors.password
  if (!hasFieldErrors && !errors.general) {
    errors.general = t('auth.register.checkData')
  }
}

const showSuccessMessage = () => {
  isSuccess.value = true
}
</script>

<template>
  <AuthPageShell wide>
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

      <div v-if="registrationClosed" class="text-center">
        <RouterLink :to="{ name: 'Login' }" class="btn btn-primary" @mouseenter="prefetchLogin" @focusin="prefetchLogin">
          {{ t('auth.register.goToLogin') }}
        </RouterLink>
      </div>

      <div v-else-if="invitationRequired && !invitationValid" class="text-center">
        <p class="text-muted mb-3">{{ t('auth.register.inviteCodeHint') }}</p>
        <form class="auth-invite-code" @submit.prevent="submitInviteCode">
          <div class="form-floating mb-3 text-start">
            <input
              id="inviteCode"
              v-model.trim="inviteCodeInput"
              type="text"
              class="form-control"
              :class="{ 'is-invalid': inviteCodeError }"
              :placeholder="t('auth.register.inviteCode')"
              :disabled="isValidatingInvite"
              autocomplete="off"
              spellcheck="false"
            >
            <label for="inviteCode">{{ t('auth.register.inviteCode') }}</label>
            <div v-if="inviteCodeError" class="invalid-feedback">{{ inviteCodeError }}</div>
          </div>
          <button type="submit" class="btn btn-primary w-100 mb-3" :disabled="isValidatingInvite">
            <span
              v-if="isValidatingInvite"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            />
            {{ isValidatingInvite ? t('common.loading') : t('auth.register.inviteCodeApply') }}
          </button>
        </form>
        <p class="small text-muted mb-3">{{ t('auth.register.inviteContactAdmin') }}</p>
        <RouterLink :to="{ name: 'Login' }" class="btn btn-outline-primary" @mouseenter="prefetchLogin" @focusin="prefetchLogin">
          {{ t('auth.register.login') }}
        </RouterLink>
      </div>

      <div v-else-if="isSuccess" class="text-center">
        <div class="alert alert-success" role="alert">
          <i class="bi bi-check-circle-fill me-2"></i>
          {{ t('auth.register.successAlert') }}
        </div>

        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ t('common.loading') }}</span>
        </div>
        <p class="text-muted mt-2">{{ t('auth.register.redirecting') }}</p>
      </div>

      <div v-if="errors.general && canShowForm" class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        {{ errors.general }}
      </div>

      <form v-if="canShowForm" @submit.prevent="submitForm" novalidate>
        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="text"
            id="firstName"
            class="form-control"
            :class="{ 'is-invalid': errors.firstName }"
            v-model="form.firstName"
            :placeholder="t('auth.register.firstName')"
            :disabled="isLoading"
            autocomplete="given-name"
          />
          <label for="firstName">
            <i class="bi bi-person me-2"></i>{{ t('auth.register.firstName') }}
          </label>
          <div v-if="errors.firstName" class="invalid-feedback">
            {{ errors.firstName }}
          </div>
        </div>

        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="text"
            id="middleName"
            class="form-control"
            :class="{ 'is-invalid': errors.middleName }"
            v-model="form.middleName"
            :placeholder="t('auth.register.middleName')"
            :disabled="isLoading"
            autocomplete="additional-name"
          />
          <label for="middleName">
            <i class="bi bi-person me-2"></i>{{ t('auth.register.middleName') }}
          </label>
          <div v-if="errors.middleName" class="invalid-feedback">
            {{ errors.middleName }}
          </div>
        </div>

        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="text"
            id="lastName"
            class="form-control"
            :class="{ 'is-invalid': errors.lastName }"
            v-model="form.lastName"
            :placeholder="t('auth.register.lastName')"
            :disabled="isLoading"
            autocomplete="family-name"
          />
          <label for="lastName">
            <i class="bi bi-person me-2"></i>{{ t('auth.register.lastName') }}
          </label>
          <div v-if="errors.lastName" class="invalid-feedback">
            {{ errors.lastName }}
          </div>
        </div>

        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="text"
            id="login"
            class="form-control"
            :class="{ 'is-invalid': errors.login }"
            v-model="form.login"
            :placeholder="t('auth.login.loginField')"
            :disabled="isLoading"
            autocomplete="username"
          />
          <label for="login">
            <i class="bi bi-at me-2"></i>{{ t('auth.login.loginField') }}
          </label>
          <div v-if="errors.login" class="invalid-feedback">
            {{ errors.login }}
          </div>
        </div>

        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="email"
            id="email"
            class="form-control"
            :class="{ 'is-invalid': errors.email }"
            v-model="form.email"
            placeholder="email@example.com"
            :disabled="isLoading || emailLocked"
            :readonly="emailLocked"
            autocomplete="email"
          />
          <label for="email">
            <i class="bi bi-envelope me-2"></i>{{ t('auth.login.email') }}
          </label>
          <div v-if="errors.email" class="invalid-feedback">
            {{ errors.email }}
          </div>
        </div>

        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="password"
            id="password"
            class="form-control"
            :class="{ 'is-invalid': errors.password }"
            v-model="form.password"
            :placeholder="t('auth.login.password')"
            :disabled="isLoading"
            autocomplete="new-password"
          />
          <label for="password">
            <i class="bi bi-lock me-2"></i>{{ t('auth.login.password') }}
          </label>
          <div v-if="errors.password" class="invalid-feedback">
            {{ errors.password }}
          </div>
        </div>

        <div class="form-floating mb-3" v-auto-animate>
          <input
            type="password"
            id="passwordConfirm"
            class="form-control"
            :class="{ 'is-invalid': errors.passwordConfirm }"
            v-model="form.passwordConfirm"
            :placeholder="t('auth.register.confirmPassword')"
            :disabled="isLoading"
            autocomplete="new-password"
          />
          <label for="passwordConfirm">
            <i class="bi bi-lock-fill me-2"></i>{{ t('auth.register.confirmPassword') }}
          </label>
          <div v-if="errors.passwordConfirm" class="invalid-feedback">
            {{ errors.passwordConfirm }}
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-100 py-3 mb-3" :disabled="isLoading">
          <span
            v-if="isLoading"
            class="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          <i v-else class="bi bi-person-plus me-2"></i>
          {{ isLoading ? t('auth.register.submitting') : t('auth.register.submit') }}
        </button>

        <div class="text-center">
          <span class="text-muted">{{ t('auth.register.hasAccount') }}</span>
          <RouterLink
            :to="{ name: 'Login' }"
            class="text-decoration-none text-primary fw-semibold ms-1"
            @mouseenter="prefetchLogin"
            @focusin="prefetchLogin"
          >
            {{ t('auth.register.login') }}
          </RouterLink>
        </div>
      </form>
    </template>
  </AuthPageShell>
</template>
