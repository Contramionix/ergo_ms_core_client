import { CheckAccessToAdminPanel, GetClosedPagesForUser } from '@/core/cms/adp/admin/js/GroupsPolitics'

/**
 * Утилиты для работы с правами доступа к меню
 */

/**
 * Фильтрует секции меню на основе прав доступа пользователя
 * @param {Array} menuSections - Массив секций меню
 * @param {Object} router - Vue Router instance
 * @param {Object} AdminPanelMenuSection - Секция админ-панели
 * @returns {Promise<Array>} - Отфильтрованный массив секций меню
 */
export async function filterMenuByPermissions(menuSections, router, AdminPanelMenuSection) {
  const filteredSections = [...menuSections]

  // Получаем закрытые страницы для пользователя
  const closedPages = await GetClosedPagesForUser()

  // Удаляем закрытые страницы из меню
  for (let closedPage of closedPages) {
    const route = router.getRoutes().find(r => r.path === closedPage.path)
    if (!route) continue

    const routeName = route.name

    for (let i = filteredSections.length - 1; i >= 0; i--) {
      const section = filteredSections[i]

      // Проверяем основную секцию
      if (section.routeName === routeName) {
        filteredSections.splice(i, 1)
        continue
      }

      // Проверяем вложенные элементы
      if (section.list && Array.isArray(section.list)) {
        section.list = section.list.filter(item => item.path !== routeName)
      }
    }
  }

  // Проверяем доступ к админ-панели
  const adminAccess = await CheckAccessToAdminPanel()

  if (!adminAccess.access_to_panel) {
    const adminIndex = filteredSections.indexOf(AdminPanelMenuSection)
    if (adminIndex !== -1) {
      filteredSections.splice(adminIndex, 1)
    }
  } else if (!adminAccess.access_to_category) {
    if (AdminPanelMenuSection.list && AdminPanelMenuSection.list.length > 0) {
      AdminPanelMenuSection.list.splice(0, 1)
    }
  }

  return filteredSections
}

