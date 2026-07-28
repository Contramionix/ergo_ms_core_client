<script setup>
import { useRouter } from 'vue-router'

import AuthPageShell from '@/core/cms/adp/components/AuthPageShell.vue'
import { useRegistrationSettings } from '@/core/cms/adp/js/useRegistrationSettings.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { prefetchRouteByName } from '@/js/utils/prefetchRoute.js'

const { showRegisterLink } = useRegistrationSettings()
const router = useRouter()
const { t } = useAppI18n()

const navigateToLogin = () => {
  router.push({ name: 'Login' })
}

function prefetchAuthRoute(name) {
  prefetchRouteByName(router, name)
}
</script>

<template>
  <AuthPageShell>
    <div class="auth-page__header">
      <h1 class="auth-page__title">{{ t('auth.start.title') }}</h1>
      <p class="auth-page__description">
        {{ t('auth.start.subtitle') }}
      </p>
    </div>

    <button
      type="button"
      class="btn btn-primary w-100 py-3"
      @mouseenter="prefetchAuthRoute('Login')"
      @focus="prefetchAuthRoute('Login')"
      @click="navigateToLogin"
    >
      <i class="bi bi-box-arrow-in-right me-2" />
      {{ t('auth.login.submit') }}
    </button>

    <div v-if="showRegisterLink" class="text-center mt-3">
      <span class="text-muted">{{ t('auth.login.noAccount') }}</span>
      <RouterLink
        :to="{ name: 'Register' }"
        class="text-decoration-none text-primary fw-semibold ms-1"
        @mouseenter="prefetchAuthRoute('Register')"
        @focusin="prefetchAuthRoute('Register')"
      >
        {{ t('auth.login.register') }}
      </RouterLink>
    </div>
  </AuthPageShell>
</template>
