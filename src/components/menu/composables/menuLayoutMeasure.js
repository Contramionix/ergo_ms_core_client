import { COLLAPSED_MENU_WIDTH } from './menuLayoutPadding.js'

/** Fallback до первого замера DOM. Контент начинается от правого края панели, без запаса под кнопку сворачивания. */
export function getMenuLayoutPaddingFallback(isCollapsed, menuWidthValue) {
  const menuOuterWidth = isCollapsed ? COLLAPSED_MENU_WIDTH : menuWidthValue
  return `${menuOuterWidth}px`
}

/** Отступ основного контента — в collapsed не зависит от hover-peek */
export function getContentLayoutPadding(isCollapsed, menuWidthValue) {
  return getMenuLayoutPaddingFallback(isCollapsed, menuWidthValue)
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
