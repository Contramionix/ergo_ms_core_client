<script setup>
/**
 * Хост плавающих виджетов модулей (shell.floating_widgets).
 * Не путать с LayoutPlugin / offcanvas.
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { collectFloatingWidgets } from '@/integrations/floatingWidgets.js'
import { logError } from '@/js/utils/logError.js'

defineProps({
  menuRightEdge: {
    type: String,
    default: '',
  },
})

const widgets = ref([])
let reloadTimer = null

async function reloadWidgets() {
  try {
    widgets.value = await collectFloatingWidgets()
  } catch (error) {
    logError('Ошибка загрузки плавающих виджетов:', error)
    widgets.value = []
  }
}

function scheduleReload() {
  window.clearTimeout(reloadTimer)
  reloadTimer = window.setTimeout(() => {
    void reloadWidgets()
  }, 300)
}

onMounted(async () => {
  window.addEventListener('access-token-changed', scheduleReload)
  window.addEventListener('session-scope-changed', scheduleReload)
  await reloadWidgets()
  // Снимок прав и remotes часто приходят после первого mount.
  window.setTimeout(() => {
    void reloadWidgets()
  }, 2000)
})

onUnmounted(() => {
  window.removeEventListener('access-token-changed', scheduleReload)
  window.removeEventListener('session-scope-changed', scheduleReload)
  window.clearTimeout(reloadTimer)
})
</script>

<template>
  <component
    v-for="widget in widgets"
    :key="widget.id"
    :is="widget.component"
    :menu-right-edge="menuRightEdge"
  />
</template>
