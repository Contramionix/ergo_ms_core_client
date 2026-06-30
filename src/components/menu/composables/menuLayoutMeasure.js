import { COLLAPSED_MENU_WIDTH } from './menuLayoutPadding.js'

/** Fallback до первого замера DOM */
export function getMenuLayoutPaddingFallback(isCollapsed, menuWidthValue) {
  const menuOuterWidth = isCollapsed ? COLLAPSED_MENU_WIDTH : menuWidthValue
  return `${menuOuterWidth}px`
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
