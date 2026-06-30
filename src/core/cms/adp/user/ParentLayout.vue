<script setup>
import MainInfo from '@/core/cms/adp/user/CardMain.vue'
</script>

<template>
  <div class="profile-page">
    <MainInfo />
    <RouterView />
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>