const MENU_COLLAPSED_STORAGE_KEY = 'menu-sidebar-collapsed'

export function readMenuCollapsedPreference() {
  if (typeof localStorage === 'undefined') {
    return false
  }

  try {
    return localStorage.getItem(MENU_COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeMenuCollapsedPreference(collapsed) {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(MENU_COLLAPSED_STORAGE_KEY, collapsed ? 'true' : 'false')
  } catch {
    // ignore quota / private mode
  }
}
