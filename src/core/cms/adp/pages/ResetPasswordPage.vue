<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PasswordInput from '@/core/cms/adp/components/PasswordInput.vue'
import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'
import { validateFieldValue, validateFieldsOnEquality } from '@/js/validation'
import { validatePasswordValue } from '@/js/passwordPolicy.js'
import { resetPassword, fetchPasswordResetSettings } from '@/core/cms/adp/js/auth-index'
import { logError } from '@/js/utils/logError.js'

const router = useRouter()
const route = useRoute()
const isLoading = ref(false)
const isSuccess = ref(false)
const isBootstrapping = ref(true)
const passwordResetSettings = ref({ password_reset_enabled: false })

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
  () => passwordResetSettings.value.password_reset_enabled === false,
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
  errors.code = validateFieldValue(form.code, 'Код подтверждения')
  errors.password = validateFieldValue(form.password, 'Новый пароль')
  errors.passwordConfirm = validateFieldValue(form.passwordConfirm, 'Подтверждение пароля')
  
  if (!errors.password) {
    const passwordComplexityError = validatePasswordValue(form.password)
    if (passwordComplexityError) {
      errors.password = passwordComplexityError
    }
  }
  
  // Проверяем совпадение паролей
  if (!errors.password && !errors.passwordConfirm) {
    const { firstFieldError, secondFieldError } = validateFieldsOnEquality(
      form.password,
      form.passwordConfirm,
      'Пароли не совпадают'
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
      form.passwordConfirm
    )
    
    if (result && result.success) {
      isSuccess.value = true
      setTimeout(() => {
        router.push({ name: 'Login' })
      }, 2000)
    } else {
      // Обрабатываем ошибки из результата
      if (result && result.errors) {
        if (result.errors.error) {
          const errorMsg = Array.isArray(result.errors.error)
            ? result.errors.error[0]
            : result.errors.error
          
          // Проверяем тип ошибки и устанавливаем в соответствующее поле
          if (errorMsg.includes('код') || errorMsg.includes('Код')) {
            errors.code = errorMsg
          } else if (errorMsg.includes('пароль') || errorMsg.includes('Пароль')) {
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
        errors.general = 'Не удалось изменить пароль'
      }
    }
    
  } catch (error) {
    logError('Ошибка сброса пароля', error)
    if (error.response) {
      if (error.response.status === 400) {
        const errorData = error.response.data
        // Обрабатываем поле error из ответа API
        if (errorData && errorData.error) {
          const errorMsg = Array.isArray(errorData.error) 
            ? errorData.error[0] 
            : errorData.error
          
          // Проверяем тип ошибки и устанавливаем в соответствующее поле
          if (errorMsg.includes('код') || errorMsg.includes('Код')) {
            errors.code = errorMsg
          } else if (errorMsg.includes('пароль') || errorMsg.includes('Пароль')) {
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
          errors.general = errorData?.detail || errorData?.message || 'Неверный код или данные'
        }
      } else if (error.response.status === 403) {
        errors.general = sanitizeError(error).message
          || 'Восстановление пароля отключено администратором.'
      } else if (error.response.status >= 500) {
        errors.general = error.response.data?.detail || error.response.data?.error || 'Ошибка сервера. Попробуйте позже'
      } else {
        errors.general = error.response.data?.error || error.response.data?.message || 'Ошибка сброса пароля'
      }
    } else if (error.request) {
      errors.general = 'Нет соединения с сервером'
    } else {
      errors.general = error.message || 'Произошла неизвестная ошибка'
    }
  } finally {
    isLoading.value = false
  }
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
        <h2 class="auth-page__title">
          {{
            isSuccess
              ? 'Пароль изменен!'
              : passwordResetDisabled
                ? 'Восстановление недоступно'
                : 'Новый пароль'
          }}
        </h2>
        <p class="auth-page__description">
          {{
            isSuccess
              ? 'Ваш пароль успешно изменен. Перенаправляем на страницу входа...'
              : passwordResetDisabled
                ? 'Самостоятельное восстановление пароля отключено администратором.'
                : 'Создайте новый пароль для вашего аккаунта'
          }}
        </p>
      </div>

          <div v-if="passwordResetDisabled" class="text-center">
            <div class="alert alert-warning" role="alert">
              <i class="bi bi-info-circle-fill me-2"></i>
              Обратитесь к администратору системы для восстановления доступа.
            </div>
            <RouterLink :to="{ name: 'Login' }" class="btn btn-outline-primary">
              <i class="bi bi-arrow-left me-2"></i>
              Вернуться к входу
            </RouterLink>
          </div>

          <div v-else-if="isSuccess" class="text-center">
          <div class="alert alert-success" role="alert">
            <i class="bi bi-check-circle-fill me-2"></i>
            Пароль успешно изменен!
          </div>
          
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Загрузка...</span>
          </div>
          <p class="text-muted mt-2">Перенаправление на страницу входа...</p>
        </div>

        <form v-else @submit.prevent="submitForm" novalidate>
          <!-- Общая ошибка -->
          <div v-if="errors.general" class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            {{ errors.general }}
          </div>

          <!-- Email (только для отображения) -->
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
              <i class="bi bi-envelope me-2"></i>Email
            </label>
          </div>

          <!-- Поле кода -->
          <div class="form-floating mb-3" v-auto-animate>
            <input
              type="text"
              id="code"
              class="form-control"
              :class="{ 'is-invalid': errors.code }"
              v-model="form.code"
              placeholder="Код подтверждения"
              :disabled="isLoading"
              maxlength="6"
            />
            <label for="code">
              <i class="bi bi-shield-check me-2"></i>Код подтверждения
            </label>
            <div v-if="errors.code" class="invalid-feedback">
              {{ errors.code }}
            </div>
          </div>

          <!-- Новый пароль -->
          <PasswordInput
            id="password"
            v-model="form.password"
            :error="errors.password"
            label="Новый пароль"
            placeholder="Новый пароль"
            autocomplete="new-password"
            :disabled="isLoading"
            class="mb-3"
          />

          <!-- Подтверждение пароля -->
          <PasswordInput
            id="passwordConfirm"
            v-model="form.passwordConfirm"
            :error="errors.passwordConfirm"
            label="Подтвердите пароль"
            placeholder="Подтвердите пароль"
            autocomplete="new-password"
            icon="bi-lock-fill"
            :disabled="isLoading"
            class="mb-4"
          />

          <!-- Кнопка сброса -->
          <button type="submit" class="btn btn-primary w-100 py-3 mb-3" :disabled="isLoading">
            <span
              v-if="isLoading"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            ></span>
            <i v-else class="bi bi-shield-check me-2"></i>
            {{ isLoading ? 'Изменение пароля...' : 'Изменить пароль' }}
          </button>

          <!-- Ссылка на вход -->
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