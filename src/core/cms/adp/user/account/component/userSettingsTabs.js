import { computed, defineAsyncComponent, markRaw } from 'vue'
import { Bell, MessageSquareText, Monitor, Palette, Shield, User } from 'lucide-vue-next'
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
      { id: 'profile', label: tGlobal('settings.tabs.profile'), icon: User, component: ProfilePanel },
      { id: 'security', label: tGlobal('settings.tabs.security'), icon: Shield, component: SecurityPanel },
      {
        id: 'notifications',
        label: tGlobal('settings.tabs.notifications'),
        icon: Bell,
        component: NotificationsPanel,
      },
    ],
  },
  {
    title: tGlobal('settings.sections.system'),
    items: [
      { id: 'system', label: tGlobal('settings.tabs.system'), icon: Monitor, component: SystemPanel },
      { id: 'themes', label: tGlobal('settings.tabs.themes'), icon: Palette, component: ThemesPanel },
      {
        id: 'toast',
        label: tGlobal('settings.tabs.toasts'),
        icon: MessageSquareText,
        component: ToastPanel,
      },
    ],
  },
])
