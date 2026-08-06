import { computed, defineAsyncComponent, markRaw } from 'vue'
import { CORE_ICON } from '@/config/coreIconNames.js'
import { tGlobal } from '@/i18n/index.js'

const ProfilePanel = markRaw(defineAsyncComponent(() => import('./settings-panels/ProfilePanel.vue')))
const SecurityPanel = markRaw(defineAsyncComponent(() => import('./settings-panels/SecurityPanel.vue')))
const NotificationsPanel = markRaw(
  defineAsyncComponent(() => import('./settings-panels/NotificationsPanel.vue')),
)
const SystemPanel = markRaw(defineAsyncComponent(() => import('./settings-panels/SystemPanel.vue')))
const ThemesPanel = markRaw(defineAsyncComponent(() => import('./settings-panels/ThemesPanel.vue')))
const ToastPanel = markRaw(defineAsyncComponent(() => import('./settings-panels/ToastPanel.vue')))

export const TAB_SECTIONS = computed(() => [
  {
    title: tGlobal('settings.sections.user'),
    items: [
      {
        id: 'profile',
        label: tGlobal('settings.tabs.profile'),
        icon: CORE_ICON.profile,
        component: ProfilePanel,
      },
      {
        id: 'security',
        label: tGlobal('settings.tabs.security'),
        icon: CORE_ICON.security,
        component: SecurityPanel,
      },
      {
        id: 'notifications',
        label: tGlobal('settings.tabs.notifications'),
        icon: CORE_ICON.notifications,
        component: NotificationsPanel,
      },
    ],
  },
  {
    title: tGlobal('settings.sections.system'),
    items: [
      {
        id: 'system',
        label: tGlobal('settings.tabs.system'),
        icon: CORE_ICON.system,
        component: SystemPanel,
      },
      {
        id: 'themes',
        label: tGlobal('settings.tabs.themes'),
        icon: CORE_ICON.themes,
        component: ThemesPanel,
      },
      {
        id: 'toast',
        label: tGlobal('settings.tabs.toasts'),
        icon: CORE_ICON.toasts,
        component: ToastPanel,
      },
    ],
  },
])
