import { currentOffcanvasSidebarPage, isOffcanvasSidebarOpen } from '@/js/useOffcanvasSidebarStore.js'

export function isMenuItemActive(item, { route, router }) {
  if (item.routeName) {
    if (route.name === item.routeName) {
      return true
    }

    if (route.name && route.name.startsWith(item.routeName) && route.name !== item.routeName) {
      try {
        const parentRoute = router.resolve({ name: item.routeName })
        if (parentRoute?.path && route.path.startsWith(parentRoute.path)) {
          return true
        }
      } catch {
        return true
      }
    }
  }

  const currentPage = currentOffcanvasSidebarPage.value
  if (!currentPage) {
    return false
  }

  if (item.isOffcanvas && item.page === currentPage && isOffcanvasSidebarOpen.value) {
    return true
  }

  if (item.page && item.page.length > 2) {
    const itemPage = item.page.toLowerCase()
    const currentPageLower = currentPage.toLowerCase()

    if (
      currentPageLower.startsWith(`${itemPage}-`)
      || currentPageLower.startsWith(`${itemPage}_`)
      || currentPageLower.startsWith(`${itemPage}.`)
    ) {
      return true
    }
  }

  if (item.page && !item.isOffcanvas && item.page === currentPage) {
    return true
  }

  return false
}
