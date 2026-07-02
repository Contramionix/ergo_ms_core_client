import { COLLAPSED_MENU_WIDTH } from './menuLayoutPadding.js'

/** Fallback до первого замера DOM */
export function getMenuLayoutPaddingFallback(isCollapsed, menuWidthValue) {
  const menuOuterWidth = isCollapsed ? COLLAPSED_MENU_WIDTH : menuWidthValue
  return `${menuOuterWidth}px`
}

/** Целевой правый край меню после завершения CSS-перехода ширины */
export function getMenuRightEdgeTarget(isCollapsed, isHovering, menuWidthValue) {
  const effectiveCollapsed = isCollapsed && !isHovering
  return getMenuLayoutPaddingFallback(effectiveCollapsed, menuWidthValue)
}

export function measureMenuLayoutOffset(menuElement) {
  if (!menuElement || typeof window === 'undefined') {
    return null
  }

  const toggle = menuElement.querySelector('.side-menu__toggle')
  const anchor = toggle ?? menuElement
  const rect = anchor.getBoundingClientRect()

  if (rect.right <= 0) {
    return null
  }

  return `${Math.ceil(rect.right)}px`
}

/** Правый край карточки меню — для стыковки вторичных панелей без зазора */
export function measureMenuRightEdge(menuElement) {
  if (!menuElement || typeof window === 'undefined') {
    return null
  }

  const rect = menuElement.getBoundingClientRect()

  if (rect.right <= 0) {
    return null
  }

  return `${Math.ceil(rect.right)}px`
}
