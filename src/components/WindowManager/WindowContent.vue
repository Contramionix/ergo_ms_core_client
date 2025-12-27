<script setup>
import { ref, onMounted, watch } from 'vue'
import WindowPlaceholder from './WindowPlaceholder.vue'

const props = defineProps({
  window: {
    type: Object,
    required: true
  }
})

const component = ref(null)
const isLoading = ref(false)
const loadError = ref(null)

// Кэш загруженных компонентов для предотвращения перерисовки
const componentCache = new Map()

// Загружаем компонент модуля напрямую без изменения URL
async function loadModuleComponent() {
  if (!props.window.routeName) {
    component.value = null
    return
  }

  // Проверяем кэш
  const cacheKey = `${props.window.id}-${props.window.routeName}`
  if (componentCache.has(cacheKey)) {
    component.value = componentCache.get(cacheKey)
    return
  }

  isLoading.value = true
  loadError.value = null
  
  try {
    // Получаем конфигурацию роута из RouteManager
    const { moduleManager } = await import('@/modules/index.js')
    await moduleManager.initialize()
    
    let routeName = props.window.routeName
    let routeConfig = await moduleManager.getRouteConfig(routeName)
    
    // Если роут имеет redirect, используем целевой роут
    if (routeConfig && routeConfig.redirect) {
      if (typeof routeConfig.redirect === 'string') {
        if (routeConfig.redirect.startsWith('/')) {
          // Абсолютный путь - не обрабатываем
          component.value = null
          loadError.value = 'Роут с абсолютным redirect не поддерживается'
          isLoading.value = false
          return
        } else {
          // Имя роута
          routeName = routeConfig.redirect
          routeConfig = await moduleManager.getRouteConfig(routeName)
        }
      } else if (routeConfig.redirect.name) {
        routeName = routeConfig.redirect.name
        routeConfig = await moduleManager.getRouteConfig(routeName)
      }
    }
    
    // Если роут не найден, пробуем найти первый дочерний роут из конфигурации модуля
    if (!routeConfig && props.window.moduleConfig) {
      const moduleConfig = props.window.moduleConfig
      // Ищем первый роут в list или children
      const firstChildRoute = (moduleConfig.list && moduleConfig.list[0]) || 
                             (moduleConfig.children && moduleConfig.children[0])
      
      if (firstChildRoute && firstChildRoute.routeName) {
        routeName = firstChildRoute.routeName
        routeConfig = await moduleManager.getRouteConfig(routeName)
      }
    }
    
    if (routeConfig) {
      // Получаем компонент из конфигурации роута
      const routeManager = moduleManager.routes
      
      // Создаем роут для получения компонента
      const routeObject = routeManager.createRoute(
        routeName,
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
          const finalComponent = loadedComponent.default || loadedComponent
          component.value = finalComponent
          // Кэшируем компонент
          componentCache.set(cacheKey, finalComponent)
        } else {
          // Если компонент уже загружен
          component.value = routeObject.component
          // Кэшируем компонент
          componentCache.set(cacheKey, routeObject.component)
        }
      } else {
        // Нет компонента - показываем плейсхолдер
        component.value = null
        loadError.value = 'Компонент не найден'
      }
    } else {
      component.value = null
      loadError.value = 'Конфигурация роута не найдена'
    }
  } catch (error) {
    console.error('Ошибка загрузки компонента модуля:', error)
    component.value = null
    loadError.value = error.message || 'Ошибка загрузки'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadModuleComponent()
})

// Загружаем только если routeName изменился (не при каждом обновлении окна)
watch(() => props.window.routeName, (newRouteName, oldRouteName) => {
  if (newRouteName !== oldRouteName) {
    loadModuleComponent()
  }
}, { immediate: false })
</script>

<template>
  <div class="window-content">
    <component
      v-if="component"
      :is="component"
      :key="`window-${window.id}`"
    />
    <WindowPlaceholder
      v-else
      :title="window.title"
      :is-loading="isLoading"
    />
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

