<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { CircleUserRound, Power } from 'lucide-vue-next'
import { useUserStore } from '@/core/cms/js/userStore.js'
import UserAvatar from '@/components/UserAvatar.vue'
import { apiClient } from '@/js/api/manager'
import { logout as authLogout } from '@/core/cms/adp/js/auth-index'
import { useDropdown } from '@/composables/useDropdown.js'
import { collectVisibleHeaderUserMenuItems } from '@/integrations/headerUserMenu.js'

const userStore = useUserStore()
const emit = defineEmits(['dropdown-toggle'])
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)

const extensionItems = ref([])

const userName = computed(() => userStore.menuUserName)

const userEmail = computed(() => {
  return userStore.user?.email || 'email не указан'
})

const baseMenuItems = [
  {
    id: 'profile',
    order: 10,
    title: 'Профиль',
    icon: CircleUserRound,
    link: { name: 'User' },
  },
  {
    id: 'logout',
    order: 100,
    title: 'Выход',
    icon: Power,
    link: { name: 'logout' },
  },
]

const menuItems = computed(() => {
  const items = baseMenuItems.slice()
  const logoutIndex = items.findIndex((item) => item.link?.name === 'logout')
  items.splice(logoutIndex, 0, ...extensionItems.value)
  return items
})

const refreshExtensionItems = async () => {
  extensionItems.value = await collectVisibleHeaderUserMenuItems()
}

defineExpose({
  closeDropdown
})

const handleLogout = async () => {
  try {
    await authLogout()
  } catch (error) {
    logError('Ошибка при logout через auth сервис:', error)
  }

  try {
    apiClient.logout()
  } catch (error) {
    logError('Ошибка при logout через apiClient:', error)
  }

  userStore.logout()
  closeDropdown()
}

onMounted(async () => {
  if (!userStore.isInitialized) {
    await userStore.initializeUser()
  }

  await refreshExtensionItems()
})

watch(isOpen, async (newValue) => {
  if (newValue) {
    await refreshExtensionItems()
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
        <button v-if="item.link?.name === 'logout'" type="button" class="dropdown-item header-dropdown-item w-100 text-start" :style="{ transitionDelay: `${(index + 1) * 50}ms` }" @click="handleLogout">
          <span class="icon-flex">
            <component :is="item.icon" :size="22" />
          </span>
          <span>{{ item.title }}</span>
        </button>
        <RouterLink v-else :to="item.link" class="dropdown-item header-dropdown-item" active-class="active" :style="{ transitionDelay: `${(index + 1) * 50}ms` }" @click="closeDropdown">
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
