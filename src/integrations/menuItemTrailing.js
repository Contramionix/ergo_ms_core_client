/**
 * Бейджи справа в строке бокового меню.
 *
 * Модули: bridge.provideMany(MENU_ITEM_TRAILING_GROUP, key, {
 *   match: { routeName }, count, title?, route?, order?, isVisible?, component?,
 * }).
 * Ядро рисует число на совпавшем пункте и на родительских группах.
 */

import { markRaw } from 'vue'

import bridge from '@/integrations/ModuleBridge.js'
import { MENU_ITEM_TRAILING_GROUP } from '@/integrations/moduleContracts.js'

export { MENU_ITEM_TRAILING_GROUP }

/**
 * @typedef {Object} MenuItemTrailingMatch
 * @property {string|string[]} routeName
 */

/**
 * @typedef {Object} MenuItemTrailingRegistration
 * @property {string} [id]
 * @property {MenuItemTrailingMatch} match
 * @property {number} [order]
 * @property {() => number} [count]
 * @property {() => string} [title]
 * @property {import('vue-router').RouteLocationRaw} [route]
 * @property {() => boolean} [isVisible]
 * @property {() => void | Promise<void>} [onClick]
 * @property {import('vue').Component} [component]
 */

function collectRouteNames(item, into = []) {
  if (!item || typeof item !== 'object') {
    return into
  }
  const routeName = item.routeName
  if (typeof routeName === 'string' && routeName) {
    into.push(routeName)
  }
  const nested = [
    ...(Array.isArray(item.list) ? item.list : []),
    ...(Array.isArray(item.children) ? item.children : []),
  ]
  nested.forEach((child) => collectRouteNames(child, into))
  return into
}

function matchRouteNames(match, routeNames) {
  const wanted = match?.routeName
  if (wanted == null || wanted === '') {
    return false
  }
  const list = Array.isArray(wanted) ? wanted : [wanted]
  const known = new Set(routeNames)
  return list.some((name) => typeof name === 'string' && known.has(name))
}

function registrationId(entry, index) {
  if (typeof entry?.id === 'string' && entry.id) {
    return entry.id
  }
  const wanted = entry?.match?.routeName
  const name = Array.isArray(wanted) ? wanted[0] : wanted
  return `${String(name || 'trailing')}:${entry?.order ?? index}`
}

/**
 * Регистрации, которые относятся к пункту или к любому его потомку.
 * count / title / isVisible вызывайте из computed хоста — так Vue увидит ref модуля.
 *
 * @param {object} item
 * @returns {MenuItemTrailingRegistration[]}
 */
export function listMenuItemTrailing(item) {
  const routeNames = collectRouteNames(item)
  if (!routeNames.length) {
    return []
  }

  return Object.values(bridge.all(MENU_ITEM_TRAILING_GROUP))
    .filter((entry) => entry && matchRouteNames(entry.match, routeNames))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map((entry, index) => ({
      ...entry,
      id: registrationId(entry, index),
      component: entry.component ? markRaw(entry.component) : null,
    }))
}