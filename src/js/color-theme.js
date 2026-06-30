/**
 * Ранняя инициализация темы до загрузки Vue (из localStorage + предпочтение light/dark/auto).
 * После initEndpoints main.js подтянет активную тему с API.
 */

import { initTheme } from './theme-manager.js'

initTheme()
