<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'
import PasswordInput from '@/core/cms/adp/components/PasswordInput.vue'
import { authorization } from '@/core/cms/adp/js/auth-index'
import { validateLoginForm } from '@/js/validation'
import { authGuard } from '@/core/cms/js/authGuard'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { getUserMenu } from '@/core/cms/js/menuService.js'
import { useRegistrationSettings } from '@/core/cms/adp/js/useRegistrationSettings.js'
import { usePasswordResetSettings } from '@/core/cms/adp/js/usePasswordResetSettings.js'

const router = useRouter()
const isLoading = ref(false)
const { showRegisterLink } = useRegistrationSettings()
const { showForgotPasswordLink } = usePasswordResetSettings()

const form = reactive({
  login: '',
  password: '',
  rememberUser: false,
})

const errors = reactive({
  login: null,
  password: null,
  general: null,
})



const validateForm = () => {
  const { loginError, passwordError } = validateLoginForm(
    form.login,
    form.password
  )

  errors.login = loginError
  errors.password = passwordError
  errors.general = null

  return !errors.login && !errors.password
}

const submitForm = async () => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true
  errors.general = null
  
  try {
    const authResult = await authorization(form.login, form.password, form.rememberUser)

    if (authResult.success === true) {
      // Готовим пользователя и меню до перехода в кабинет, иначе данные приходят
      // поэтапно и аватар/инициалы дёргаются при первом входе.
      await Promise.all([
        useUserStore().ensureUserReady(),
        getUserMenu(),
        import('@/js/theme-service.js').then(({ syncSiteThemeFromApi }) => syncSiteThemeFromApi()),
      ])

      // Запускаем проверку токена после успешной авторизации
      authGuard.startTokenValidation()
      router.push({ name: 'AppHome' })
    } else {
      // Обработка ошибок от сервера
      if (authResult.errors && typeof authResult.errors === 'object') {
        if (authResult.errors.message || authResult.errors.detail) {
          errors.general = authResult.errors.message || authResult.errors.detail
        } else if (authResult.errors.username) {
          errors.login = Array.isArray(authResult.errors.username) 
            ? authResult.errors.username[0] 
            : authResult.errors.username
        } else if (authResult.errors.password) {
          errors.password = Array.isArray(authResult.errors.password)
            ? authResult.errors.password[0]
            : authResult.errors.password
        } else {
          errors.general = 'Неверные учетные данные'
        }
      } else if (authResult.message) {
        errors.general = authResult.message
      } else {
        errors.general = 'Произошла ошибка при авторизации'
      }
    }
  } catch (error) {
    logError('Login error:', error)
    
    // Обработка сетевых ошибок и ошибок сервера
    if (error.response) {
      if (error.response.status === 400) {
        const errorData = error.response.data
        if (errorData && typeof errorData === 'string') {
          errors.general = errorData
        } else if (errorData && errorData.message) {
          errors.general = errorData.message
        } else if (errorData && errorData.detail) {
          errors.general = errorData.detail
        } else {
          errors.general = 'Неверные учетные данные'
        }
      } else if (error.response.status === 401) {
        errors.general = 'Неверные учетные данные'
      } else if (error.response.status >= 500) {
        errors.general = 'Ошибка сервера. Попробуйте позже'
      } else {
        errors.general = 'Ошибка подключения к серверу'
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
</script>

<template>
  <AuthPageShell>
    <div class="auth-page__header">
      <h2 class="auth-page__title">Вход в систему</h2>
      <p class="auth-page__description">Введите ваши учетные данные</p>
    </div>

        <!-- Общая ошибка -->
        <div v-if="errors.general" class="alert alert-danger" role="alert">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          {{ errors.general }}
        </div>

        <form @submit.prevent="submitForm" novalidate>
          <!-- Поле логина -->
          <div class="form-floating mb-3" v-auto-animate>
            <input
              type="text"
              id="login"
              class="form-control"
              :class="{ 'is-invalid': errors.login }"
              v-model="form.login"
              placeholder="Логин"
              :disabled="isLoading"
              autocomplete="username"
            />
            <label for="login">
              <i class="bi bi-person me-2"></i>Логин
            </label>
            <div v-if="errors.login" class="invalid-feedback">
              {{ errors.login }}
            </div>
          </div>

          <!-- Поле пароля -->
          <PasswordInput
            id="password"
            v-model="form.password"
            :error="errors.password"
            :disabled="isLoading"
            class="mb-3"
          />

          <!-- Дополнительные опции -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div class="form-check">
              <input
                type="checkbox"
                id="rememberUser"
                class="form-check-input"
                v-model="form.rememberUser"
                :disabled="isLoading"
              />
              <label class="form-check-label text-muted" for="rememberUser">
                Запомнить меня
              </label>
            </div>

            <RouterLink
              v-if="showForgotPasswordLink"
              :to="{ name: 'ForgotPassword' }"
              class="text-decoration-none text-primary"
            >
              Забыли пароль?
            </RouterLink>
          </div>

          <!-- Кнопка входа -->
          <button type="submit" class="btn btn-primary w-100 py-3 mb-3" :disabled="isLoading">
            <span
              v-if="isLoading"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            <i v-else class="bi bi-box-arrow-in-right me-2"></i>
            {{ isLoading ? 'Выполняется вход...' : 'Войти' }}
          </button>

          <!-- Ссылка на регистрацию -->
          <div v-if="showRegisterLink" class="text-center">
            <span class="text-muted">Нет аккаунта? </span>
            <RouterLink :to="{ name: 'Register' }" class="text-decoration-none text-primary fw-semibold">
              Зарегистрироваться
            </RouterLink>
          </div>
        </form>
  </AuthPageShell>
</template>