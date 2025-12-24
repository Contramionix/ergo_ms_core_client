import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

export const useWindowManagerStore = defineStore('windowManager', () => {
  // Состояние окон
  const windows = ref([])
  const maxWindows = ref(4)
  const activeWindowId = ref(null)
  
  // Доступные модули (загружаются из ModuleManager)
  const availableModules = ref([])
  
  // Computed
  const activeWindow = computed(() => 
    windows.value.find(w => w.id === activeWindowId.value)
  )
  
  const canOpenNewWindow = computed(() => 
    windows.value.length < maxWindows.value
  )
  
  // Actions
  function createWindow(moduleId, moduleConfig) {
    if (!canOpenNewWindow.value) {
      throw new Error('Достигнут максимум окон')
    }
    
    const initialPos = calculateInitialPosition(windows.value.length)
    const window = {
      id: uuidv4(),
      moduleId,
      title: moduleConfig.title || moduleConfig.name,
      route: moduleConfig.route || (moduleConfig.routeName ? { name: moduleConfig.routeName } : null),
      routeName: moduleConfig.routeName,
      position: { x: initialPos.x, y: initialPos.y },
      size: calculateInitialSize(),
      isMinimized: false,
      isMaximized: false,
      isDetached: false,
      zIndex: getNextZIndex(),
      isActive: true,
      moduleConfig
    }
    
    windows.value.push(window)
    setActiveWindow(window.id)
    saveWindowsToStorage()
    
    return window
  }
  
  function closeWindow(windowId) {
    const index = windows.value.findIndex(w => w.id === windowId)
    if (index !== -1) {
      windows.value.splice(index, 1)
      if (activeWindowId.value === windowId && windows.value.length > 0) {
        setActiveWindow(windows.value[windows.value.length - 1].id)
      } else if (windows.value.length === 0) {
        activeWindowId.value = null
      }
      saveWindowsToStorage()
    }
  }
  
  function setActiveWindow(windowId) {
    // Если идет перетаскивание, не меняем активное окно
    if (isDragging.value) return
    
    const targetWindow = windows.value.find(w => w.id === windowId)
    if (!targetWindow) return
    
    // Если окно уже активно, ничего не делаем
    if (targetWindow.isActive) return
    
    // Используем requestAnimationFrame для плавного переключения без перерисовки
    requestAnimationFrame(() => {
      // Деактивируем только текущее активное окно (не все)
      const currentActive = windows.value.find(w => w.isActive && w.id !== windowId)
      if (currentActive) {
        currentActive.isActive = false
      }
      
      // Активируем выбранное окно
      targetWindow.isActive = true
      targetWindow.zIndex = getNextZIndex()
      activeWindowId.value = windowId
    })
  }
  
  function setDragging(value) {
    isDragging.value = value
  }
  
  function updateWindowPosition(windowId, position, snapToSlot = false) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.position = position
      saveWindowsToStorage()
    }
  }
  
  function updateWindowSize(windowId, size) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.size = size
      saveWindowsToStorage()
    }
  }
  
  function toggleMinimize(windowId) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.isMinimized = !window.isMinimized
      saveWindowsToStorage()
    }
  }
  
  function toggleMaximize(windowId) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      // Сохраняем размер перед максимизацией, если разворачиваем
      if (!window.isMaximized) {
        window._savedSize = { ...window.size }
        window._savedPosition = { ...window.position }
      }
      
      window.isMaximized = !window.isMaximized
      
      // Восстанавливаем размер при сворачивании
      if (!window.isMaximized && window._savedSize) {
        window.size = window._savedSize
        window.position = window._savedPosition
      }
      
      saveWindowsToStorage()
    }
  }
  
  function detachWindow(windowId) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.isDetached = true
      saveWindowsToStorage()
    }
  }
  
  function dockWindow(windowId) {
    const window = windows.value.find(w => w.id === windowId)
    if (window) {
      window.isDetached = false
      saveWindowsToStorage()
    }
  }
  
  async function loadAvailableModules() {
    try {
      const { moduleManager } = await import('@/modules/index.js')
      await moduleManager.initialize()
      const menuConfig = await moduleManager.getMenuConfig()
      const iconManager = moduleManager.icons
      
      availableModules.value = (menuConfig.menuSections || []).map(section => ({
        id: (section.routeName || section.name || '').toLowerCase(),
        name: section.title || section.name,
        icon: iconManager.getIcon(section.icon),
        iconName: section.icon,
        route: section.routeName ? { name: section.routeName } : null,
        routeName: section.routeName,
        moduleConfig: section
      })).filter(module => module.id && module.routeName) // Фильтруем только валидные модули
    } catch (error) {
      console.error('Ошибка загрузки модулей:', error)
      availableModules.value = []
    }
  }
  
  // Вспомогательные функции
  function calculateInitialPosition(index) {
    // Вычисляем позицию с небольшим смещением для каждого окна
    const gap = 30
    const baseX = gap
    const baseY = gap
    const offsetX = (index % 3) * 50
    const offsetY = Math.floor(index / 3) * 50
    
    return {
      x: baseX + offsetX,
      y: baseY + offsetY
    }
  }
  
  function calculateSnapPosition(snapLayout, containerSize) {
    // Вычисляем позицию на основе snap layout
    const { width, height } = containerSize
    const zone = snapLayout.zones[0] // Берем первую зону
    
    return {
      x: (zone.x / 100) * width,
      y: (zone.y / 100) * height,
      snapLayout: snapLayout.id
    }
  }
  
  function calculateSnapSize(snapLayout, containerSize) {
    // Вычисляем размер на основе snap layout
    const { width, height } = containerSize
    const zone = snapLayout.zones[0] // Берем первую зону
    
    return {
      width: `${(zone.width / 100) * width}px`,
      height: `${(zone.height / 100) * height}px`
    }
  }
  
  
  function calculateInitialSize() {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const isTablet = typeof window !== 'undefined' && window.innerWidth < 1200
    
    if (isMobile) {
      return { width: '100%', height: '100%' }
    } else if (isTablet) {
      // Для планшета: фиксированный размер
      return { 
        width: '450px', 
        height: '400px' 
      }
    } else {
      // Для десктопа: фиксированный размер
      return { 
        width: '600px', 
        height: '500px' 
      }
    }
  }
  
  function getNextZIndex() {
    if (windows.value.length === 0) return 1
    return Math.max(...windows.value.map(w => w.zIndex), 0) + 1
  }
  
  // LocalStorage
  function saveWindowsToStorage() {
    try {
      const windowsData = windows.value.map(w => ({
        id: w.id,
        moduleId: w.moduleId,
        position: w.position,
        size: w.size,
        isMinimized: w.isMinimized,
        isMaximized: w.isMaximized,
        isDetached: w.isDetached,
        zIndex: w.zIndex,
        routeName: w.routeName
      }))
      localStorage.setItem('windowManager_windows', JSON.stringify(windowsData))
      if (activeWindowId.value) {
        localStorage.setItem('windowManager_activeWindowId', activeWindowId.value)
      }
    } catch (e) {
      console.error('Ошибка сохранения окон:', e)
    }
  }
  
  function loadWindowsFromStorage() {
    try {
      const saved = localStorage.getItem('windowManager_windows')
      const activeId = localStorage.getItem('windowManager_activeWindowId')
      
      if (saved) {
        const windowsData = JSON.parse(saved)
        // Восстанавливаем только структуру, модули загрузятся отдельно
        // Важно: сбрасываем isMaximized при загрузке, чтобы окна не разворачивались автоматически
        windows.value = windowsData.map(w => ({
          ...w,
          isMaximized: false, // Принудительно сбрасываем максимизацию
          isMinimized: w.isMinimized || false
        }))
        if (activeId) {
          activeWindowId.value = activeId
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки окон:', e)
    }
  }
  
  return {
    // State
    windows,
    maxWindows,
    activeWindowId,
    availableModules,
    // Computed
    activeWindow,
    canOpenNewWindow,
    // Actions
    createWindow,
    closeWindow,
    setActiveWindow,
    updateWindowPosition,
    updateWindowSize,
    calculateSnapPosition,
    calculateSnapSize,
    toggleMinimize,
    toggleMaximize,
    detachWindow,
    dockWindow,
    loadAvailableModules,
    loadWindowsFromStorage,
    saveWindowsToStorage
  }
})

