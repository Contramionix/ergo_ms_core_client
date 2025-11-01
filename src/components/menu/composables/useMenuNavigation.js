import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

/**
 * Composable для управления навигацией в меню
 */
export function useMenuNavigation(menuSections) {
  const route = useRoute()
  const openGroupRouteName = ref(null)
  const preventAutoOpen = ref(false)
  const nestedOpenStates = ref({})

  // Рекурсивная функция для поиска родительской группы по маршруту
  const findParentGroupByRoute = (routeName, sections) => {
    for (let section of sections) {
      if (section.routeName === routeName) {
        return section.routeName
      }

      if (section.list && Array.isArray(section.list)) {
        for (let item of section.list) {
          if (item.routeName === routeName) {
            return section.routeName
          }
        }
      }

      if (section.children && Array.isArray(section.children)) {
        const found = findParentInChildren(routeName, section.children)
        if (found) {
          return section.routeName
        }
      }
    }
    return null
  }

  // Рекурсивная функция для поиска в дочерних элементах
  const findParentInChildren = (routeName, children) => {
    for (let child of children) {
      if (child.routeName === routeName) {
        return true
      }
      if (child.children && Array.isArray(child.children)) {
        if (findParentInChildren(routeName, child.children)) {
          return true
        }
      }
    }
    return false
  }

  // Рекурсивная функция для открытия всех вложенных групп
  const openNestedGroupsForRoute = (routeName, sections) => {
    const findAndOpenNestedGroups = (routeName, children, parentId = '') => {
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        const childId = `${child.routeName || child.page || child.name}_${parentId ? parentId + '_' : ''}${i}`

        if (child.routeName === routeName) {
          return true
        }

        if (child.children && Array.isArray(child.children)) {
          if (findAndOpenNestedGroups(routeName, child.children, childId)) {
            nestedOpenStates.value[childId] = true
            return true
          }
        }
      }
      return false
    }

    for (let section of sections) {
      if (section.children && Array.isArray(section.children)) {
        findAndOpenNestedGroups(routeName, section.children)
      }
    }
  }

  // Переключение группы
  const toggleGroup = (routeName) => {
    if (openGroupRouteName.value === routeName) {
      preventAutoOpen.value = true
      openGroupRouteName.value = null
    } else {
      openGroupRouteName.value = routeName
    }
  }

  // Обработчик переключения вложенных групп
  const toggleNestedGroup = (groupId) => {
    nestedOpenStates.value[groupId] = !nestedOpenStates.value[groupId]
  }

  // Отслеживание изменения маршрута
  watch(
    () => route.matched,
    (newMatched) => {
      if (preventAutoOpen.value) {
        preventAutoOpen.value = false
        return
      }

      if (menuSections.value && Array.isArray(menuSections.value)) {
        const currentRouteName = newMatched[0]?.name
        const parentGroup = findParentGroupByRoute(currentRouteName, menuSections.value)

        if (parentGroup) {
          openGroupRouteName.value = parentGroup
          openNestedGroupsForRoute(currentRouteName, menuSections.value)
        }
      }
    },
    { immediate: false }
  )

  return {
    openGroupRouteName,
    nestedOpenStates,
    toggleGroup,
    toggleNestedGroup,
    findParentGroupByRoute,
    openNestedGroupsForRoute
  }
}

