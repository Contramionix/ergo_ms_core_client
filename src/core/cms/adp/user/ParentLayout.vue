<script setup>
import MainInfo from '@/core/cms/adp/user/CardMain.vue'

function cachedRouteKey(activeRoute) {
  return activeRoute.name ?? activeRoute.path
}
</script>

<template>
  <div class="profile-page">
    <MainInfo />
    <RouterView v-slot="{ Component, route: activeRoute }">
      <KeepAlive :max="5">
        <component :is="Component" v-if="Component" :key="cachedRouteKey(activeRoute)" />
      </KeepAlive>
    </RouterView>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
</style>