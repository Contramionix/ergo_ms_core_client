<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LayoutMenu from '@/LayoutMenu.vue'
import LayoutStart from '@/LayoutStart.vue'
import LayoutPublic from '@/LayoutPublic.vue'
import MaintenancePage from '@/components/MaintenancePage.vue'
import NotificationProvider from '@/components/NotificationProvider.vue'
import HoverTooltipLayer from '@/components/HoverTooltipLayer.vue'
import RouteProgressBar from '@/components/RouteProgressBar.vue'
import {
  checkMaintenanceStatus,
  startMaintenancePolling,
  stopMaintenancePolling,
  useMaintenanceMode,
} from '@/composables/useMaintenanceMode.js'
import { hideBootstrapMask } from '@/js/bootstrapMask.js'

const route = useRoute()
const router = useRouter()
const { maintenanceActive, maintenanceDetail } = useMaintenanceMode()

const isReady = ref(false)

function revealApp() {
  // Снимаем маску загрузки только после того, как layout (включая боковое
  // меню с гидратацией из кеша) полностью отрисован — это убирает мигание
  // иконок и FOUC при перезагрузке.
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(hideBootstrapMask)
    })
  })
}

onMounted(() => {
  Promise.all([
    router.isReady(),
    checkMaintenanceStatus({ reloadOnChange: false }),
  ]).then(() => {
    isReady.value = true
    revealApp()
    startMaintenancePolling()
  })
})

onUnmounted(() => {
  stopMaintenancePolling()
})

const currentLayout = computed(() => {
  if (route.meta && route.meta.startRoute === true) {
    return LayoutStart
  }
  return route.meta && route.meta.public === true ? LayoutPublic : LayoutMenu
})
</script>

<template>
  <div v-if="isReady" class="app-root">
    <div
      class="app-root__main"
      :class="{ 'app-root__main--behind-maintenance': maintenanceActive }"
      :aria-hidden="maintenanceActive ? 'true' : undefined"
      :inert="maintenanceActive"
    >
      <component :is="currentLayout" />
      <NotificationProvider />
      <HoverTooltipLayer />
      <RouteProgressBar />
    </div>

    <Transition name="maintenance-overlay" appear>
      <MaintenancePage
        v-if="maintenanceActive"
        :detail="maintenanceDetail"
        overlay
      />
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.app-root {
  position: relative;
  min-height: 100dvh;
}

.app-root__main {
  min-height: inherit;
  transition:
    filter 0.35s ease,
    opacity 0.35s ease;
}

.app-root__main--behind-maintenance {
  pointer-events: none;
  user-select: none;
  opacity: 0.45;
  filter: blur(3px);
}

@media (prefers-reduced-motion: reduce) {
  .app-root__main,
  .app-root__main--behind-maintenance {
    transition: none;
    opacity: 1;
    filter: none;
  }
}
</style>
