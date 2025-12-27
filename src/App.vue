<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LayoutMenu from '@/LayoutMenu.vue'
import LayoutStart from '@/LayoutStart.vue'
import LayoutPublic from '@/LayoutPublic.vue'
import LayoutWindows from '@/LayoutWindows.vue'
import NotificationProvider from '@/components/NotificationProvider.vue'

const route = useRoute()
const router = useRouter()

const isReady = ref(false)
router.isReady().then(() => {
  isReady.value = true
})

// Проверяем, использовать ли новый UI с окнами
// Можно переключать через query параметр ?ui=windows или localStorage
const useWindowsUI = computed(() => {
  // Проверяем query параметр
  if (route.query.ui === 'windows') {
    return true
  }
  if (route.query.ui === 'menu') {
    return false
  }
  // Проверяем localStorage (для сохранения выбора пользователя)
  const savedUI = localStorage.getItem('ergo_ms_ui_mode')
  return savedUI === 'windows'
})

const currentLayout = computed(() => {
  if (route.meta && route.meta.startRoute === true) {
    return LayoutStart
  }
  if (route.meta && route.meta.public === true) {
    return LayoutPublic
  }
  // Используем новый UI с окнами, если включен
  return useWindowsUI.value ? LayoutWindows : LayoutMenu
})
</script>

<template>
  <div v-if="isReady">
    <component :is="currentLayout" />
    <NotificationProvider />
  </div>
</template>
