<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  window: {
    type: Object,
    required: true
  }
})

const component = ref(null)
const isLoading = ref(false)
const currentRouteName = ref(null)

// Загружаем компонент модуля напрямую без изменения URL
async function loadModuleComponent() {
  if (!props.window.routeName) {
    component.value = null
    return
  }

  isLoading.value = true
  
  try {
    // Получаем конфигурацию роута из RouteManager
    const { moduleManager } = await import('@/modules/index.js')
    await moduleManager.initialize()
    
    const routeConfig = await moduleManager.getRouteConfig(props.window.routeName)
    
    if (routeConfig) {
      // Получаем компонент из конфигурации роута
      const routeManager = moduleManager.routes
      
      // Создаем роут для получения компонента
      const routeObject = routeManager.createRoute(
        props.window.routeName,
        routeConfig,
        {
          title: props.window.title,
          meta: routeConfig.meta || {}
        }
      )
      
      if (routeObject && routeObject.component) {
        // Если это функция (lazy component)
        if (typeof routeObject.component === 'function') {
          const loadedComponent = await routeObject.component()
          component.value = loadedComponent.default || loadedComponent
        } else {
          // Если компонент уже загружен
          component.value = routeObject.component
        }
      } else {
        // Fallback: используем RouterView, но без навигации
        component.value = 'router-view-fallback'
        currentRouteName.value = props.window.routeName
      }
    } else {
      component.value = null
    }
  } catch (error) {
    console.error('Ошибка загрузки компонента модуля:', error)
    component.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadModuleComponent()
})

watch(() => props.window.routeName, () => {
  loadModuleComponent()
})
</script>

<template>
  <div class="window-content">
    <div v-if="isLoading" class="window-content__loading">
      <div class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">Загрузка...</span>
      </div>
    </div>
    <component
      v-else-if="component && component !== 'router-view-fallback'"
      :is="component"
      :key="`window-${window.id}-${window.routeName}`"
    />
    <div v-else-if="component === 'router-view-fallback'" class="window-content__fallback">
      <p class="text-muted">Используется RouterView для: {{ window.routeName }}</p>
      <p class="text-muted small">Компонент загружается через основной роутер</p>
    </div>
    <div v-else class="window-content__empty">
      <p class="text-muted">Модуль не загружен</p>
      <p class="text-muted small">RouteName: {{ window.routeName || 'не указан' }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.window-content {
  width: 100%;
  height: 100%;
  overflow: auto;
  
  &__loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
  }
  
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    gap: 0.5rem;
  }
  
  &__fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    gap: 0.5rem;
  }
}
</style>

