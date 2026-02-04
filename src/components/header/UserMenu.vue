<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { CircleUserRound, Power, Building2 } from 'lucide-vue-next'
import { useUserStore } from '@/core/cms/js/userStore.js'
import UserAvatar from '@/components/UserAvatar.vue'
import { apiClient } from '@/js/api/manager'
import { logout as authLogout } from '@/core/cms/adp/js/auth-index'
import { useDropdown } from '@/composables/useDropdown.js'
import { tokenService } from '@/core/cms/js/tokenService.js'
import { hasAnyModulePermission } from '@/core/cms/adp/js/accessControl.js'

const userStore = useUserStore()
const emit = defineEmits(['dropdown-toggle'])
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)

// Состояние для отображения вкладки "Организация"
const canShowOrganizationTab = ref(false)

// Вычисляем имя пользователя напрямую из userStore.user
const userName = computed(() => {
  if (!userStore.user) return 'Гость'
  
  if (userStore.user.initials_name && userStore.user.initials_name.trim()) {
    return userStore.user.initials_name
  }
  
  // Используем full_name как fallback
  if (userStore.user.full_name && userStore.user.full_name.trim()) {
    return userStore.user.full_name
  }
  
  // Используем username как последний fallback
  return userStore.user.username || 'Гость'
})

// Вычисляем email пользователя
const userEmail = computed(() => {
  return userStore.user?.email || 'email не указан'
})

const baseMenuItems = [
  {
    id: 1,
    title: 'Профиль',
    icon: CircleUserRound,
    link: { name: 'User' },
  },
  {
    id: 3,
    title: 'Выход',
    icon: Power,
    link: { name: 'logout' },
  },
]

const organizationMenuItem = {
  id: 2,
  title: 'Организация',
  icon: Building2,
  link: { name: 'OrganizationSettingsMain' },
}

const menuItems = computed(() => {
  const items = baseMenuItems.slice()
  if (canShowOrganizationTab.value) {
    items.splice(1, 0, organizationMenuItem)
  }
  return items
})

/**
 * Проверяет, должна ли отображаться вкладка "Организация".
 * Вкладка отображается только если:
 * 1. Пользователь авторизован в организацию (есть organization_id в JWT)
 * 2. Пользователь имеет права на настройки организации (org_settings или org_manage)
 */
const checkOrganizationTabVisibility = async () => {
  // Проверяем наличие активной организации в JWT токене
  const hasActiveOrg = tokenService.hasActiveOrganization()
  
  if (!hasActiveOrg) {
    canShowOrganizationTab.value = false
    return
  }
  
  // Проверяем права на управление/просмотр настроек организации
  // Используем константы прав модуля organizations
  const hasOrgPermissions = await hasAnyModulePermission('organizations', [
    'org_settings',  // Право на просмотр настроек
    'org_manage'     // Право на управление организацией
  ])
  
  canShowOrganizationTab.value = hasOrgPermissions
}

// Экспортируем метод для внешнего вызова
defineExpose({
  closeDropdown
})

// Централизованный выход из аккаунта
const handleLogout = async () => {
  try {
    // Очищаем токены и связанные с ними данные через auth-сервис
    await authLogout()
  } catch (error) {
    console.error('Ошибка при logout через auth сервис:', error)
  }

  try {
    // Дополнительно очищаем токены API-клиента (на случай разных сценариев выхода)
    apiClient.logout()
  } catch (error) {
    console.error('Ошибка при logout через apiClient:', error)
  }

  // Сбрасываем состояние пользователя и выполняем редирект на /login
  userStore.logout()

  closeDropdown()
}

// Инициализируем пользователя при загрузке компонента
onMounted(async () => {
  if (!userStore.isInitialized) {
    await userStore.initializeUser()
  }

  // Проверяем, нужно ли показывать вкладку "Организация"
  await checkOrganizationTabVisibility()
})

// Обновляем состояние при каждом открытии dropdown
// (на случай, если пользователь вошёл/вышел из организации)
watch(isOpen, async (newValue) => {
  if (newValue) {
    await checkOrganizationTabVisibility()
  }
})
</script>

<template>
  <div ref="dropdownRef" class="user-menu-wrapper">
    <div @click.stop="toggleDropdown" class="tools__avatar avatar">
      <UserAvatar :size="40" :clickable="true" :title="userName"/>
    </div>
    <Transition name="dropdown-left">
      <ul v-if="isOpen" class="user-dropdown-menu">
      <li class="dropdown-header px-3 py-2 border-bottom">
        <div class="d-flex align-items-center">
          <div class="me-2">
            <UserAvatar :size="32" :title="userName"/>
          </div>
          <div class="flex-grow-1 min-width-0">
            <div class="fw-semibold text-truncate">{{ userName }}</div>
            <small class="text-muted text-truncate d-block">{{ userEmail }}</small>
          </div>
        </div>
        <div v-if="userStore.isLoading" class="mt-1">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Загрузка...</span>
          </div>
        </div>
      </li>
      <li v-for="(item, index) in menuItems" :key="item.id">
        <button
          v-if="item.link?.name === 'logout'"
          type="button"
          class="dropdown-item header-dropdown-item w-100 text-start"
          :style="{ transitionDelay: `${(index + 1) * 50}ms` }"
          @click="handleLogout"
        >
          <span class="icon-flex">
            <component :is="item.icon" :size="22" />
          </span>
          <span>{{ item.title }}</span>
        </button>
        <RouterLink
          v-else
          :to="item.link"
          class="dropdown-item header-dropdown-item"
          active-class="active"
          :style="{ transitionDelay: `${(index + 1) * 50}ms` }"
          @click="closeDropdown"
        >
          <span class="icon-flex">
            <component :is="item.icon" :size="22" />
          </span>
          <span>{{ item.title }}</span>
        </RouterLink>
      </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.user-menu-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
  height: 100%;
}

.tools__avatar {
  cursor: pointer;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-dropdown-menu {
  @include dropdown-menu-base;
  left: 0;
  transform: translate(0, -8px);
  min-width: 280px;
}

.dropdown-header {
  background-color: var(--bs-gray-50);
  
  .text-truncate {
    max-width: 200px;
  }
}

.min-width-0 {
  min-width: 0;
}

.avatar :deep(.user-avatar-image) {
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.avatar :deep(.user-avatar--clickable:hover .user-avatar-image) {
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.dropdown-header :deep(.user-avatar-image) {
  border-width: 1px;
}
</style>

<style lang="scss">
// Анимация для left-выравнивания UserMenu (глобальные стили для Transition)
.user-dropdown-menu.dropdown-left-enter-active,
.user-dropdown-menu.dropdown-left-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.user-dropdown-menu.dropdown-left-enter-from {
  opacity: 0;
  transform: translate(0, -16px) !important;
}

.user-dropdown-menu.dropdown-left-enter-to {
  opacity: 1;
  transform: translate(0, -8px) !important;
}

.user-dropdown-menu.dropdown-left-leave-from {
  opacity: 1;
  transform: translate(0, -8px) !important;
}

.user-dropdown-menu.dropdown-left-leave-to {
  opacity: 0;
  transform: translate(0, -16px) !important;
}
</style>