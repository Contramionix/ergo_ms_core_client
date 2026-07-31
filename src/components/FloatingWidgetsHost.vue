<script setup>
/**
 * Хост плавающих виджетов модулей (shell.floating_widgets).
 * Не путать с LayoutPlugin / offcanvas.
 */
import { onMounted, ref } from 'vue'
import { collectFloatingWidgets } from '@/integrations/floatingWidgets.js'
import { logError } from '@/js/utils/logError.js'

defineProps({
  menuRightEdge: {
    type: String,
    default: '',
  },
})

const widgets = ref([])

onMounted(async () => {
  try {
    widgets.value = await collectFloatingWidgets()
  } catch (error) {
    logError('Ошибка загрузки плавающих виджетов:', error)
    widgets.value = []
  }
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
