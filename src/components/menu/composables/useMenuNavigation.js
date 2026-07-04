import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export function getMenuGroupKey(section) {
  if (!section) return null
  if (section.id != null) return `id:${section.id}`
  if (section.routeName) return `route:${section.routeName}`
  const label = section.title || section.name
  return label ? `name:${label}` : null
}

export function buildMenuItemGroupId(item, level) {
  return `${item.routeName || item.page || item.name}_${level}`
}

function getMenuItemNestedItems(item) {
  return [...(item.list || []), ...(item.children || [])]
}

function routeBelongsToMenuItem(routeName, item) {
  if (item.routeName === routeName) {
    return true
  }

  return getMenuItemNestedItems(item).some((child) => routeBelongsToMenuItem(routeName, child))
}

function routeBelongsToSection(routeName, section) {
  if (section.routeName === routeName) {
    return true
  }

  return getMenuItemNestedItems(section).some((item) => routeBelongsToMenuItem(routeName, item))
}

/**
 * Composable для управления навигацией в меню
 */
export function useMenuNavigation(menuSections) {
  const route = useRoute()
  const openGroupKey = ref(null)
  const manuallyCollapsedGroups = ref(new Set())
  const nestedOpenStates = ref({})
  const manuallyCollapsedNested = ref(new Set())

  const findParentGroupKeyByRoute = (routeName, sections) => {
    for (const section of sections) {
      if (routeBelongsToSection(routeName, section)) {
        return getMenuGroupKey(section)
      }
    }
    return null
  }

  const openNestedGroupsForRoute = (routeName, sections) => {
    const visitItems = (items, level) => {
      if (!items?.length) return false

      for (const item of items) {
        if (item.routeName === routeName) {
          return true
        }

        const nested = getMenuItemNestedItems(item)
        if (!nested.length) {
          continue
        }

        if (visitItems(nested, level + 1)) {
          const groupId = buildMenuItemGroupId(item, level)
          if (!manuallyCollapsedNested.value.has(groupId)) {
            nestedOpenStates.value[groupId] = true
          }
          return true
        }
      }

      return false
    }

    for (const section of sections) {
      visitItems(getMenuItemNestedItems(section), 0)
    }
  }

  const syncOpenGroupForRoute = (currentRouteName) => {
    if (!menuSections.value?.length || !currentRouteName) {
      return
    }

    const parentGroupKey = findParentGroupKeyByRoute(currentRouteName, menuSections.value)

    if (!parentGroupKey) {
      manuallyCollapsedGroups.value.clear()
      return
    }

    for (const collapsedKey of [...manuallyCollapsedGroups.value]) {
      if (collapsedKey !== parentGroupKey) {
        manuallyCollapsedGroups.value.delete(collapsedKey)
      }
    }

    if (!manuallyCollapsedGroups.value.has(parentGroupKey)) {
      openGroupKey.value = parentGroupKey
    }

    openNestedGroupsForRoute(currentRouteName, menuSections.value)
  }

  const toggleGroup = (groupKey) => {
    if (!groupKey) return

    if (openGroupKey.value === groupKey) {
      manuallyCollapsedGroups.value.add(groupKey)
      openGroupKey.value = null
      return
    }

    manuallyCollapsedGroups.value.delete(groupKey)
    openGroupKey.value = groupKey
  }

  const toggleNestedGroup = (groupId) => {
    if (nestedOpenStates.value[groupId]) {
      manuallyCollapsedNested.value.add(groupId)
      nestedOpenStates.value[groupId] = false
      return
    }

    manuallyCollapsedNested.value.delete(groupId)
    nestedOpenStates.value[groupId] = true
  }

  watch(
    () => route.matched,
    (newMatched) => {
      syncOpenGroupForRoute(newMatched[0]?.name)
    },
    { immediate: false },
  )

  return {
    getMenuGroupKey,
    openGroupKey,
    nestedOpenStates,
    toggleGroup,
    toggleNestedGroup,
    syncOpenGroupForRoute,
  }
}
