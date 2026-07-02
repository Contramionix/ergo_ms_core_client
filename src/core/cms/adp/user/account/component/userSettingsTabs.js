import { markRaw } from 'vue'
import { Bell, MessageSquareText, Monitor, Shield, User } from 'lucide-vue-next'
import NotificationsPanel from './settings-panels/NotificationsPanel.vue'
import ProfilePanel from './settings-panels/ProfilePanel.vue'
import SecurityPanel from './settings-panels/SecurityPanel.vue'
import SystemPanel from './settings-panels/SystemPanel.vue'
import ToastPanel from './settings-panels/ToastPanel.vue'

export const TAB_SECTIONS = [
  {
    title: 'Настройки пользователя',
    items: [
      { id: 'profile', label: 'Профиль', icon: User, component: markRaw(ProfilePanel) },
      { id: 'security', label: 'Безопасность', icon: Shield, component: markRaw(SecurityPanel) },
      { id: 'notifications', label: 'Уведомления', icon: Bell, component: markRaw(NotificationsPanel) },
    ],
  },
  {
    title: 'Настройки системы',
    items: [
      { id: 'system', label: 'Система', icon: Monitor, component: markRaw(SystemPanel) },
      {
        id: 'toast',
        label: 'Всплывающие уведомления',
        icon: MessageSquareText,
        component: markRaw(ToastPanel),
      },
    ],
  },
]
