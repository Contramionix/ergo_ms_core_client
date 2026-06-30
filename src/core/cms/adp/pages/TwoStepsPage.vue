<template>
  <AuthPageShell>
    <div class="auth-page__header">
      <h2 class="auth-page__title">Двухфакторная аутентификация</h2>
      <p class="auth-page__description">
        Введите код из приложения для аутентификации
      </p>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="mb-3">
        <label for="code" class="form-label">Код подтверждения</label>
        <input
          id="code"
          v-model="code"
          type="text"
          class="form-control"
          placeholder="000000"
          maxlength="6"
          required
        />
      </div>
      <button type="submit" class="btn btn-primary w-100 py-3">
        Подтвердить
      </button>
    </form>

    <div class="text-center mt-3">
      <RouterLink :to="{ name: 'Login' }" class="text-decoration-none text-primary">
        <i class="bi bi-arrow-left me-2" />
        Вернуться к входу
      </RouterLink>
    </div>
  </AuthPageShell>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/js/utils/toast.js'

import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'

const router = useRouter()
const toast = useToast()
const code = ref('')

const handleSubmit = () => {
  toast.warning('Двухфакторная аутентификация не настроена')
  router.push({ name: 'Login' })
}
</script>
