<template>
  <div class="d-flex justify-content-center align-items-center min-vh-100 bg-light">
    <div class="card shadow-sm" style="width: 400px;">
      <div class="card-body p-4">
        <h3 class="text-center mb-4">Двухфакторная аутентификация</h3>
        <p class="text-center text-muted mb-4">
          Введите код из приложения для аутентификации
        </p>
        <form @submit.prevent="handleSubmit">
          <div class="mb-3">
            <label for="code" class="form-label">Код подтверждения</label>
            <input
              type="text"
              class="form-control"
              id="code"
              v-model="code"
              placeholder="000000"
              maxlength="6"
              required
            />
          </div>
          <button type="submit" class="btn btn-primary w-100">
            Подтвердить
          </button>
        </form>
        <div class="text-center mt-3">
          <router-link to="/login" class="text-decoration-none">
            Вернуться к входу
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const router = useRouter()
const toast = useToast()
const code = ref('')

const handleSubmit = () => {
  // TODO: Реализовать логику проверки кода двухфакторной аутентификации
  toast.warning('Двухфакторная аутентификация не настроена')
  router.push({ name: 'Login' })
}
</script>

<style scoped>
.min-vh-100 {
  min-height: 100vh;
}
</style>

