<script setup>
import { onMounted } from 'vue'
import { useWindowManagerStore } from '@/stores/windowManager'
import WindowManager from '@/components/WindowManager/WindowManager.vue'
import ModuleDock from '@/components/ModuleDock/ModuleDock.vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { accessDeniedState } from './js/accessDeniedState'
import AccessDenied from '@/components/AccessDenied.vue'

const windowManagerStore = useWindowManagerStore()
const userStore = useUserStore()

onMounted(async () => {
  // Инициализируем пользователя при загрузке
  await userStore.initializeUser()
  
  // Загружаем доступные модули
  await windowManagerStore.loadAvailableModules()
})
</script>

<template>
  <div class="windows-layout">
    <div class="windows-layout__content">
      <AccessDenied
        v-if="accessDeniedState.active"
        bordered
        :title="accessDeniedState.title"
        :message="accessDeniedState.message"
      />
      <WindowManager v-else />
    </div>
    <ModuleDock />
  </div>
</template>

<style scoped lang="scss">
.windows-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--bs-body-bg, #f8f9fa);
  box-sizing: border-box;
}

.windows-layout__content {
  flex: 1;
  overflow: hidden;
  padding-bottom: 80px; // Отступ для dock
  position: relative;
  width: 100%;
  height: calc(100vh - 80px);
  box-sizing: border-box;
}

@media (max-width: 767.98px) {
  .windows-layout__content {
    padding-bottom: 70px;
  }
}
</style>

