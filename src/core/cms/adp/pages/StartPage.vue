<template>
  <div class="welcome-container">
    <div>
      <h1>{{ message }}</h1>
    </div>
    <div class="d-flex justify-content-center align-items-center card-container">
      <div class="auth-box">
        <button type="submit" class="btn btn-primary w-100" @click="navigateToLogin">
          Авторизация
        </button>
        <div v-if="showRegisterLink" class="mt-3 text-center no-select">
          Нет аккаунта?
          <RouterLink :to="{ name: 'Register' }" class="text-decoration-none">
            Зарегистрироваться
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchRegistrationSettings } from '@/core/cms/adp/js/auth-index'

const message = 'Авторизуйтесь в системе'
const showRegisterLink = ref(true)

const router = useRouter()

const navigateToLogin = () => {
  router.push({ name: 'Login' })
}

onMounted(async () => {
  try {
    const settings = await fetchRegistrationSettings()
    showRegisterLink.value = settings.mode === 'open'
  } catch {
    showRegisterLink.value = true
  }
})
</script>

<style lang="scss" scoped>
.welcome-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100dvh;
  text-align: center;
  padding: 16px;
  box-sizing: border-box;
  width: 100%;
}

.card-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.auth-box {
  width: 100%;
  max-width: 500px;
}

h1 {
  color: var(--color-primary-text);
  font-size: clamp(30px, 4vw, $font-size-h0);
  line-height: 1.2;
  font-weight: bold;
  white-space: normal;
  word-break: break-word;
  text-overflow: ellipsis;
  user-select: none;
  margin-bottom: 20px;
}
</style>
