/**
 * МАППИНГ ИКОНОК ДЛЯ КОНФИГУРАЦИОННОГО МЕНЮ
 * 
 * Управление иконками через модульную систему (IconManager).
 * Предоставляет доступ к иконкам из lucide-vue-next.
 */

import { getIcon, moduleManager } from '@/modules/index.js'

export const iconMapping = moduleManager.icons.iconMapping

export { getIcon }
