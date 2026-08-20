<template>
  <span class="visually-hidden" aria-hidden="true" />
</template>
<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { logout } from '@/core/cms/adp/js/auth-index';
import { authGuard } from '@/core/cms/js/authGuard';
import { clearPostLoginReturnPath } from '@/core/cms/js/postLoginReturn.js';

const router = useRouter();

onMounted(async () => {
    // Останавливаем проверку токена перед выходом
    authGuard.stopTokenValidation()
    clearPostLoginReturnPath()
    await logout()
    router.push({ name: 'Login' })
})
</script>