import { ref, onBeforeUnmount } from 'vue'

/**
 * Размеры иконок пунктов меню. Логотип (шестерёнка) в шапке — фиксированный :size в MenuList.
 */
export function buildMenuIconSizes(innerWidth) {
  const compact = innerWidth < 1440
  return {
    item: compact ? 18 : 20,
    chevronNested: compact ? 14 : 16,
    chevronGroup: compact ? 18 : 20,
    divider: compact ? 18 : 20,
    toggle: compact ? 18 : 20,
  }
}

export function getDefaultMenuIconSizes() {
  return buildMenuIconSizes(
    typeof window !== 'undefined' ? window.innerWidth : 1600,
  )
}

export function useMenuIconSizes() {
  const menuIconSizes = ref(getDefaultMenuIconSizes())

  const sync = () => {
    if (typeof window === 'undefined') return
    menuIconSizes.value = buildMenuIconSizes(window.innerWidth)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', sync)
  }

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', sync)
    }
  })

  return { menuIconSizes }
}

export const MENU_ICON_SIZES_KEY = 'menuIconSizes'
