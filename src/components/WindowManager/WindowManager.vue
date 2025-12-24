<script setup>
import { computed, onMounted } from 'vue'
import { useWindowManagerStore } from '@/stores/windowManager'
import Window from './Window.vue'

const windowManagerStore = useWindowManagerStore()

const windows = computed(() => windowManagerStore.windows)

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
  // Фон с градиентом для лучшего эффекта liquid glass
  background: linear-gradient(
    135deg,
    rgba(248, 249, 250, 0.9) 0%,
    rgba(233, 236, 239, 0.9) 100%
  );
  box-sizing: border-box;
  
  // Для темной темы
  @media (prefers-color-scheme: dark) {
    background: linear-gradient(
      135deg,
      rgba(20, 20, 20, 0.9) 0%,
      rgba(30, 30, 30, 0.9) 100%
    );
  }
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

