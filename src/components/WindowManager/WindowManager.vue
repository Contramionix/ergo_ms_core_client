<script setup>
import { computed, onMounted } from 'vue'
import { useWindowManagerStore } from '@/stores/windowManager'
import Window from './Window.vue'
import { useWindowGrid } from './composables/useWindowGrid.js'

const windowManagerStore = useWindowManagerStore()

const windows = computed(() => windowManagerStore.windows)
const { isMobile, isTablet } = useWindowGrid(windows)

onMounted(() => {
  // Загружаем сохраненные окна из localStorage
  windowManagerStore.loadWindowsFromStorage()
})
</script>

<template>
  <div class="window-manager-container">
    <div class="window-manager-grid">
      <Window
        v-for="window in windows"
        :key="window.id"
        :window="window"
      />
    </div>
    <div
      v-if="windows.length === 0"
      class="window-manager__empty"
    >
      <p class="text-muted">Откройте модуль из нижней панели</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.window-manager-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bs-body-bg, #f8f9fa);
  box-sizing: border-box;
}

.window-manager-grid {
  position: relative;
  width: 100%;
  height: 100%;
}

.window-manager__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}
</style>

