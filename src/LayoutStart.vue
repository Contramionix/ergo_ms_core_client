<script setup>
import LayoutBackdrop from '@/components/LayoutBackdrop.vue'
</script>

<template>
  <div class="layout-start">
    <LayoutBackdrop />
    <div class="layout-start__content">
      <RouterView :key="$route.path" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-start {
  position: relative;
  min-height: 100dvh;
  background: var(--color-background);
  overflow-x: clip;
}

.layout-start__content {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: inherit;
}
</style>
