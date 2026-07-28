<template>
  <span class="visually-hidden" aria-hidden="true" />
</template>
<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { logout } from '@/core/cms/adp/js/auth-index';
import { authGuard } from '@/core/cms/js/authGuard';

const router = useRouter();

onMounted(async () => {
    // Останавливаем проверку токена перед выходом
    authGuard.stopTokenValidation()
    await logout()
    router.push({name:'StartPage'})
})
</script>