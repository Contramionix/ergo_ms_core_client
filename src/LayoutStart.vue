<script setup>
import LayoutBackdrop from '@/components/LayoutBackdrop.vue'
import RouteViewAnimated from '@/components/RouteViewAnimated.vue'
import { preloadAuthSettings } from '@/composables/useAuthSettingsPreload.js'

// Сразу в setup (до onMounted дочерних страниц), чтобы /login не мигал ссылками.
preloadAuthSettings()
</script>

<template>
  <div class="layout-start">
    <LayoutBackdrop />
    <div class="layout-start__content">
      <RouteViewAnimated :use-keep-alive="false" />
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
  overflow: clip;
}
</style>
