<template>
</template>
<script setup>
import { onMounted } from 'vue';
import { logout } from '@/core/cms/adp/js/auth-index';
import { authGuard } from '@/core/cms/js/authGuard';
import router from '@/js/routers';

onMounted(async () => {
    // Останавливаем проверку токена перед выходом
    authGuard.stopTokenValidation()
    await logout()
    router.push({name:'StartPage'})
})
</script>