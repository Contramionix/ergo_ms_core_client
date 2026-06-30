<script setup>
import { useRouter } from 'vue-router'

import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'
import { useRegistrationSettings } from '@/core/cms/adp/js/useRegistrationSettings.js'

const { showRegisterLink } = useRegistrationSettings()
const router = useRouter()

const navigateToLogin = () => {
  router.push({ name: 'Login' })
}
</script>

<template>
  <AuthPageShell>
    <div class="auth-page__header">
      <h2 class="auth-page__title">Авторизуйтесь в системе</h2>
      <p class="auth-page__description">
        Войдите под своей учётной записью, чтобы продолжить работу с платформой
      </p>
    </div>

    <button type="button" class="btn btn-primary w-100 py-3" @click="navigateToLogin">
      <i class="bi bi-box-arrow-in-right me-2" />
      Войти
    </button>

    <div v-if="showRegisterLink" class="text-center mt-3">
      <span class="text-muted">Нет аккаунта?</span>
      <RouterLink :to="{ name: 'Register' }" class="text-decoration-none text-primary fw-semibold ms-1">
        Зарегистрироваться
      </RouterLink>
    </div>
  </AuthPageShell>
</template>
