<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const LayoutMenu = defineAsyncComponent(() => import('@/LayoutMenu.vue'))
const LayoutStart = defineAsyncComponent(() => import('@/LayoutStart.vue'))
const LayoutPublic = defineAsyncComponent(() => import('@/LayoutPublic.vue'))
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
import { clientEnv } from '@/js/clientEnv.js'

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
  ]).then(([, maintenanceOn]) => {
    isReady.value = true
    revealApp()
    // Dev (Vite) — всегда опрашиваем, иначе live on/off не работает при
    // CLIENT_MAINTENANCE_POLL_ENABLED=false в .env. Prod — флаг или уже ON.
    if (clientEnv.maintenancePollEnabled || clientEnv.isDev || maintenanceOn) {
      startMaintenancePolling()
    }
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
      v-if="!maintenanceActive"
      class="app-root__main"
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
}
</style>
