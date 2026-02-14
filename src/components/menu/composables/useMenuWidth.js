import { ref } from 'vue'

/**
 * Composable для управления шириной меню
 */
export function useMenuWidth() {
  const menuWidth = ref(260)
  const minMenuWidth = 260
  const maxMenuWidth = Infinity
  let widthUpdateTimeout = null

  // Фиксированная ширина блока имени в тулбаре (единый размер меню с активной/неактивной вкладкой)
  const getMinNameWidthForToolbar = (context) => {
    context.font = '14px system-ui, -apple-system, sans-serif'
    return context.measureText('Имя Фамилия').width
  }

  // Функция для расчета ширины тулбара
  const calculateToolbarWidth = (userStore) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return 0
    }

    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      let toolbarWidth = 40 // Аватар

      if (userStore.user) {
        const nameWidth = getMinNameWidthForToolbar(context)
        context.font = '12px system-ui, -apple-system, sans-serif'
        const statusWidth = context.measureText('В сети').width
        toolbarWidth += Math.max(nameWidth, statusWidth) + 15
      } else {
        toolbarWidth += 60
      }

      toolbarWidth += 15 // Отступ
      toolbarWidth += 32 * 3 // 3 кнопки
      toolbarWidth += 2 * 2 // Промежутки
      toolbarWidth += 40 // Padding
      toolbarWidth += 20 // Запас

      return toolbarWidth
    } catch {
      return 280
    }
  }

  // Функция для расчета оптимальной ширины меню
  const calculateOptimalWidth = (menuSections, siteName, userStore, getSeparator, shouldShowSeparator) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return minMenuWidth
    }

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    context.font = '14px system-ui, -apple-system, sans-serif'

    let maxWidth = 0

    // Проверяем ширину названия сайта
    const siteNameWidth = context.measureText(siteName || 'ERGO MS').width + 80
    maxWidth = Math.max(maxWidth, siteNameWidth)

    // Проверяем все секции меню
    if (menuSections && Array.isArray(menuSections)) {
      menuSections.forEach(section => {
        if (!section || !section.title) return

        const titleWidth = context.measureText(section.title).width + 100
        maxWidth = Math.max(maxWidth, titleWidth)

        if (section.list && Array.isArray(section.list)) {
          section.list.forEach(item => {
            if (!item || !item.name) return
            const itemWidth = context.measureText(item.name).width + 120
            maxWidth = Math.max(maxWidth, itemWidth)
          })
        }
      })

      // Проверяем разделители
      for (let i = 0; i < menuSections.length; i++) {
        if (shouldShowSeparator(i)) {
          const separatorText = getSeparator(i)
          if (separatorText) {
            const separatorWidth = context.measureText(separatorText).width + 80
            maxWidth = Math.max(maxWidth, separatorWidth)
          }
        }
      }
    }

    // Учитываем ширину тулбара
    const toolbarWidth = calculateToolbarWidth(userStore)
    maxWidth = Math.max(maxWidth, toolbarWidth)

    maxWidth += 10 // Запас

    return Math.max(maxWidth, minMenuWidth)
  }

  // Обновление ширины с дебаунсом
  const updateMenuWidth = (menuSections, siteName, userStore, getSeparator, shouldShowSeparator, emit, isCollapsed) => {
    if (typeof window !== 'undefined') {
      if (widthUpdateTimeout) {
        clearTimeout(widthUpdateTimeout)
      }

      widthUpdateTimeout = setTimeout(() => {
        const newWidth = calculateOptimalWidth(menuSections, siteName, userStore, getSeparator, shouldShowSeparator)
        if (newWidth !== menuWidth.value) {
          menuWidth.value = newWidth
          if (!isCollapsed) {
            emit('left-padding', `${newWidth + 40}px`)
          }
          emit('menu-state-change', isCollapsed, menuWidth.value)
        }
      }, 150)
    }
  }

  // Первоначальная установка ширины
  const initializeMenuWidth = (menuSections, siteName, userStore, getSeparator, shouldShowSeparator, emit, isCollapsed) => {
    if (typeof window !== 'undefined') {
      const newWidth = calculateOptimalWidth(menuSections, siteName, userStore, getSeparator, shouldShowSeparator)
      menuWidth.value = newWidth

      setTimeout(() => {
        if (!isCollapsed) {
          emit('left-padding', `${menuWidth.value + 40}px`)
        }
        emit('menu-state-change', isCollapsed, menuWidth.value)
      }, 100)

      setTimeout(() => {
        updateMenuWidth(menuSections, siteName, userStore, getSeparator, shouldShowSeparator, emit, isCollapsed)
      }, 300)
    }
  }

  // Настройка отслеживания изменений
  const setupWidthTracking = (callback) => {
    if (typeof window === 'undefined') return

    window.addEventListener('resize', callback)
    callback()
  }

  return {
    menuWidth,
    minMenuWidth,
    maxMenuWidth,
    calculateOptimalWidth,
    updateMenuWidth,
    initializeMenuWidth,
    setupWidthTracking
  }
}