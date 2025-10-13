<template>
</template>
<script setup>
import { onMounted } from 'vue';
import { logout } from '@/core/cms/adp/js/auth-index';
import router from '@/js/routers';
router
onMounted(()=>{
    logout()
    router.push({name:'StartPage'})
})
</script>