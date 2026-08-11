<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const LayoutMenu = defineAsyncComponent(() => import('@/LayoutMenu.vue'))
const LayoutStart = defineAsyncComponent(() => import('@/LayoutStart.vue'))
const LayoutPublic = defineAsyncComponent(() => import('@/LayoutPublic.vue'))
import MaintenancePage from '@/components/MaintenancePage.vue'
import TooManyRequestsPage from '@/components/TooManyRequestsPage.vue'
import NotificationProvider from '@/components/NotificationProvider.vue'
import HoverTooltipLayer from '@/components/HoverTooltipLayer.vue'
import RouteProgressBar from '@/components/RouteProgressBar.vue'
import {
  checkMaintenanceStatus,
  startMaintenancePolling,
  stopMaintenancePolling,
  useMaintenanceMode,
} from '@/composables/useMaintenanceMode.js'
import { useRateLimitNotice } from '@/composables/useRateLimitNotice.js'
import { hideBootstrapMask } from '@/js/bootstrapMask.js'

const route = useRoute()
const router = useRouter()
const { maintenanceActive, maintenanceDetail } = useMaintenanceMode()
const {
  rateLimitActive,
  retryAfterSeconds,
  rateLimitRetrying,
  retryRateLimitNotice,
} = useRateLimitNotice()

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
    // События (visibility) + опрос /maintenance.json только пока режим ON.
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

    <Transition name="maintenance-overlay" appear>
      <TooManyRequestsPage
        v-if="rateLimitActive && !maintenanceActive"
        overlay
        :retry-after="retryAfterSeconds"
        :retrying="rateLimitRetrying"
        @retry="retryRateLimitNotice"
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
