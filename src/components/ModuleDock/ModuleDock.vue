<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useWindowManagerStore } from '@/stores/windowManager'
import ModuleIcon from './ModuleIcon.vue'
import { useDockScroll } from './composables/useDockScroll.js'

const windowManagerStore = useWindowManagerStore()

const dockRef = ref(null)
const scrollLeft = ref(0)

const availableModules = computed(() => windowManagerStore.availableModules)
const activeModuleId = computed(() => {
  const activeWindow = windowManagerStore.activeWindow
  return activeWindow?.moduleId || null
})

const { handleScroll, scrollToModule } = useDockScroll(dockRef, scrollLeft)

function handleModuleClick(module) {
  // Проверяем, есть ли уже открытое окно с этим модулем
  const existingWindow = windowManagerStore.windows.find(
    w => w.moduleId === module.id
  )
  
  if (existingWindow) {
    // Активируем существующее окно
    windowManagerStore.setActiveWindow(existingWindow.id)
  } else {
    // Создаем новое окно
    if (windowManagerStore.canOpenNewWindow) {
      windowManagerStore.createWindow(module.id, module.moduleConfig || module)
    } else {
      // Если достигнут максимум окон, заменяем последнее
      const lastWindow = windowManagerStore.windows[windowManagerStore.windows.length - 1]
      if (lastWindow) {
        windowManagerStore.closeWindow(lastWindow.id)
        windowManagerStore.createWindow(module.id, module.moduleConfig || module)
      }
    }
  }
}

onMounted(async () => {
  // Загружаем доступные модули
  await windowManagerStore.loadAvailableModules()
})

onBeforeUnmount(() => {
  // Cleanup если нужно
})
</script>

<template>
  <div
    ref="dockRef"
    class="module-dock"
    @scroll="handleScroll"
  >
    <div class="module-dock__container">
      <ModuleIcon
        v-for="module in availableModules"
        :key="module.id"
        :module="module"
        :is-active="activeModuleId === module.id"
        @click="handleModuleClick"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@import './styles/dock.scss';
</style>

