import { ref } from 'vue'

import { getSiteWordmarkText } from '@/js/siteWordmark.js'

const MENU_ITEM_MEASURE_FONT = '14px system-ui, -apple-system, sans-serif'
const SITE_BRAND_MEASURE_FONT = 'bold 22px system-ui, -apple-system, sans-serif'
const VIEWPORT_WIDTH_CAP_FRACTION = 0.26
const MENU_WIDTH_ABSOLUTE_MAX = 280

function effectiveMaxMenuWidth() {
  if (typeof window === 'undefined') return MENU_WIDTH_ABSOLUTE_MAX
  return Math.min(
    MENU_WIDTH_ABSOLUTE_MAX,
    Math.floor(window.innerWidth * VIEWPORT_WIDTH_CAP_FRACTION)
  )
}

/**
 * Composable для управления шириной меню
 */
export function useMenuWidth() {
  const menuWidth = ref(260)
  const minMenuWidth = 240
  const maxMenuWidth = MENU_WIDTH_ABSOLUTE_MAX
  let widthUpdateTimeout = null

  const getMinNameWidthForToolbar = (context) => {
    context.font = MENU_ITEM_MEASURE_FONT
    return context.measureText('Имя Фамилия').width
  }

  const calculateToolbarWidth = (userStore) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return 0
    }

    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      let toolbarWidth = 40

      if (userStore.user) {
        const nameWidth = getMinNameWidthForToolbar(context)
        context.font = '12px system-ui, -apple-system, sans-serif'
        const statusWidth = context.measureText('В сети').width
        toolbarWidth += Math.max(nameWidth, statusWidth) + 15
      } else {
        toolbarWidth += 60
      }

      toolbarWidth += 15
      toolbarWidth += 32 * 3
      toolbarWidth += 2 * 2
      toolbarWidth += 40
      toolbarWidth += 20

      return toolbarWidth
    } catch {
      return 280
    }
  }

  const calculateOptimalWidth = (menuSections, userStore, getSeparator, shouldShowSeparator) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return minMenuWidth
    }

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    let maxWidth = 0

    context.font = SITE_BRAND_MEASURE_FONT
    const siteNameWidth = context.measureText(getSiteWordmarkText()).width + 100
    maxWidth = Math.max(maxWidth, siteNameWidth)

    context.font = MENU_ITEM_MEASURE_FONT

    if (menuSections && Array.isArray(menuSections)) {
      menuSections.forEach(section => {
        if (!section || !section.title) return

        const titleWidth = context.measureText(section.title).width + 72
        maxWidth = Math.max(maxWidth, titleWidth)

        if (section.list && Array.isArray(section.list)) {
          section.list.forEach(item => {
            if (!item || !item.name) return
            const itemWidth = context.measureText(item.name).width + 64
            maxWidth = Math.max(maxWidth, itemWidth)
          })
        }
      })

      for (let i = 0; i < menuSections.length; i++) {
        if (shouldShowSeparator(i)) {
          const separatorText = getSeparator(i)
          if (separatorText) {
            const separatorWidth = context.measureText(separatorText).width + 56
            maxWidth = Math.max(maxWidth, separatorWidth)
          }
        }
      }
    }

    const toolbarWidth = calculateToolbarWidth(userStore)
    maxWidth = Math.max(maxWidth, toolbarWidth)

    maxWidth += 8

    const capped = Math.min(maxWidth, effectiveMaxMenuWidth())
    return Math.max(capped, minMenuWidth)
  }

  const updateMenuWidth = (menuSections, userStore, getSeparator, shouldShowSeparator, onChange, isCollapsed) => {
    if (typeof window !== 'undefined') {
      if (widthUpdateTimeout) {
        clearTimeout(widthUpdateTimeout)
      }

      widthUpdateTimeout = setTimeout(() => {
        const newWidth = calculateOptimalWidth(menuSections, userStore, getSeparator, shouldShowSeparator)
        if (newWidth !== menuWidth.value) {
          menuWidth.value = newWidth
          onChange?.(isCollapsed, menuWidth.value)
        }
      }, 150)
    }
  }

  const initializeMenuWidth = (menuSections, userStore, getSeparator, shouldShowSeparator, onChange, isCollapsed) => {
    if (typeof window === 'undefined') {
      return
    }

    const newWidth = calculateOptimalWidth(
      menuSections,
      userStore,
      getSeparator,
      shouldShowSeparator,
    )

    if (newWidth !== menuWidth.value) {
      menuWidth.value = newWidth
    }

    onChange?.(isCollapsed, menuWidth.value)
  }

  const setupWidthTracking = (callback) => {
    if (typeof window === 'undefined') return

    window.addEventListener('resize', callback)
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
