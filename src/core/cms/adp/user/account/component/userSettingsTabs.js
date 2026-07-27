import { defineAsyncComponent, markRaw } from 'vue'
import { Bell, MessageSquareText, Monitor, Palette, Shield, User } from 'lucide-vue-next'

const ProfilePanel = markRaw(defineAsyncComponent(() => import('./settings-panels/ProfilePanel.vue')))
const SecurityPanel = markRaw(defineAsyncComponent(() => import('./settings-panels/SecurityPanel.vue')))
const NotificationsPanel = markRaw(
  defineAsyncComponent(() => import('./settings-panels/NotificationsPanel.vue')),
)
const SystemPanel = markRaw(defineAsyncComponent(() => import('./settings-panels/SystemPanel.vue')))
const ThemesPanel = markRaw(defineAsyncComponent(() => import('./settings-panels/ThemesPanel.vue')))
const ToastPanel = markRaw(defineAsyncComponent(() => import('./settings-panels/ToastPanel.vue')))

export const TAB_SECTIONS = [
  {
    title: 'Настройки пользователя',
    items: [
      { id: 'profile', label: 'Профиль', icon: User, component: ProfilePanel },
      { id: 'security', label: 'Безопасность', icon: Shield, component: SecurityPanel },
      { id: 'notifications', label: 'Уведомления', icon: Bell, component: NotificationsPanel },
    ],
  },
  {
    title: 'Настройки системы',
    items: [
      { id: 'system', label: 'Система', icon: Monitor, component: SystemPanel },
      { id: 'themes', label: 'Темы оформления', icon: Palette, component: ThemesPanel },
      {
        id: 'toast',
        label: 'Всплывающие уведомления',
        icon: MessageSquareText,
        component: ToastPanel,
      },
    ],
  },
]
