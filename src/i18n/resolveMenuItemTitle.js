import { teGlobal, tGlobal } from '@/i18n/index.js'
import { resolveRouteTitle } from '@/i18n/resolveRouteTitle.js'

/**
 * Известные подписи из БД (миграции / дефолтные разделители) → ключ i18n.
 * Произвольные имена из админки без ключа остаются как есть.
 */
const STORED_MENU_LABEL_KEYS = {
  Настройки: 'menu.separators.settings',
  Модули: 'menu.separators.modules',
  'Настройки системы': 'routes.systemSettings',
  'Настройки сайта': 'routes.systemSettings',
  'Личный кабинет': 'routes.account',
  'Админ-панель': 'routes.adminPanel',
  Пользователи: 'routes.users',
  'Панель пользователей': 'routes.users',
  Роли: 'routes.roles',
  'Ролевые группы': 'routes.roleGroups',
  'Политики и права': 'routes.accessControl',
  'Управление доступом': 'routes.accessControl',
  'Доступ и права': 'routes.accessControl',
  'Управление меню': 'routes.menu',
  'Темы оформления': 'routes.themes',
  Темы: 'routes.themes',
  'Журнал аудита': 'routes.audit',
  'Журнал действий': 'routes.audit',
  'Мониторинг клиентов': 'routes.audit',

  Приглашения: 'routes.invitations',
  'Запросы на изменение профиля': 'routes.profileChangeRequests',
  'Заявки на изменение данных профиля': 'routes.profileChangeRequests',
  'Загрузка пользователей': 'routes.importUsers',
}

/**
 * Переводит сохранённую в БД подпись меню, если для неё есть ключ.
 * @param {string} [label='']
 * @returns {string}
 */
export function resolveStoredMenuLabel(label = '') {
  if (!label || typeof label !== 'string') {
    return ''
  }
  if (teGlobal(label)) {
    return tGlobal(label)
  }
  const mappedKey = STORED_MENU_LABEL_KEYS[label]
  if (mappedKey && teGlobal(mappedKey)) {
    return tGlobal(mappedKey)
  }
  return label
}

/**
 * Заголовок пункта бокового меню: meta.titleKey маршрута, иначе подпись из БД.
 * @param {{ routeName?: string, name?: string, title?: string }|null|undefined} item
 * @param {{ hasRoute?: Function, resolve?: Function }|null|undefined} router
 * @returns {string}
 */
export function resolveMenuItemTitle(item, router) {
  const fallback = item?.name || item?.title || ''
  const routeName = item?.routeName
  if (routeName && router && typeof router.hasRoute === 'function' && router.hasRoute(routeName)) {
    try {
      // getRoutes — без follow redirect: иначе shell (MCT/LMS → dashboard)
      // подменяет title на «Дашборд»/«Сводка».
      const routes = typeof router.getRoutes === 'function' ? router.getRoutes() : []
      const record = routes.find((entry) => entry.name === routeName)
      if (record) {
        const fromRoute = resolveRouteTitle(record, '')
        if (fromRoute) {
          return fromRoute
        }
      }
    } catch {
      // маршрут недоступен — ниже fallback из БД
    }
  }
  return resolveStoredMenuLabel(fallback)
}

/**
 * Подпись разделителя бокового меню.
 * @param {string} [text='']
 * @returns {string}
 */
export function resolveMenuSeparatorTitle(text = '') {
  return resolveStoredMenuLabel(text)
}
