<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LayoutMenu from '@/LayoutMenu.vue'
import LayoutStart from '@/LayoutStart.vue'
import LayoutPublic from '@/LayoutPublic.vue'
import NotificationProvider from '@/components/NotificationProvider.vue'
import HoverTooltipLayer from '@/components/HoverTooltipLayer.vue'
import RouteProgressBar from '@/components/RouteProgressBar.vue'
import { hideBootstrapMask } from '@/js/bootstrapMask.js'

const route = useRoute()
const router = useRouter()

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

router.isReady().then(() => {
  isReady.value = true
  revealApp()
})

const currentLayout = computed(() => {
  if (route.meta && route.meta.startRoute === true) {
    return LayoutStart
  }
  return route.meta && route.meta.public === true ? LayoutPublic : LayoutMenu
})
</script>

<template>
  <div v-if="isReady">
    <component :is="currentLayout" />
    <NotificationProvider />
    <HoverTooltipLayer />
    <RouteProgressBar />
  </div>
</template>
