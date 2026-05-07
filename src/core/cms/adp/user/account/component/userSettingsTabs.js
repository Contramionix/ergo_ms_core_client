import { markRaw } from 'vue'
import { Bell, Monitor, User } from 'lucide-vue-next'
import NotificationsPanel from './settings-panels/NotificationsPanel.vue'
import ProfilePanel from './settings-panels/ProfilePanel.vue'
import SystemPanel from './settings-panels/SystemPanel.vue'

export const TAB_SECTIONS = [
  {
    title: 'Настройки пользователя',
    items: [
      { id: 'profile', label: 'Профиль', icon: User, component: markRaw(ProfilePanel) },
      { id: 'notifications', label: 'Уведомления', icon: Bell, component: markRaw(NotificationsPanel) },
    ],
  },
  {
    title: 'Настройки системы',
    items: [{ id: 'system', label: 'Система', icon: Monitor, component: markRaw(SystemPanel) }],
  },
]
