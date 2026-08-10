<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/core/cms/js/userStore.js'
import UserAvatar from '@/components/UserAvatar.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { CORE_ICON } from '@/config/coreIconNames.js'
import { useDropdown } from '@/composables/useDropdown.js'
import { collectVisibleHeaderUserMenuItems } from '@/integrations/headerUserMenu.js'
import { logError } from '@/js/utils/logError.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const props = defineProps({
  showName: {
    type: Boolean,
    default: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const avatarSize = computed(() => (props.compact ? 36 : 40))

const { t } = useAppI18n()
const userStore = useUserStore()
const router = useRouter()
const emit = defineEmits(['dropdown-toggle'])
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)

const extensionItems = ref([])

const userName = computed(() => userStore.menuUserName)
const userNameTruncated = computed(() => userStore.menuUserNameTruncated)

const userEmail = computed(() => {
  return userStore.user?.email || t('menu.userMenu.emailMissing')
})

const menuItems = computed(() => {
  const items = [
    {
      id: 'profile',
      order: 10,
      title: t('menu.userMenu.profile'),
      icon: CORE_ICON.profile,
      link: { name: 'User' },
    },
    {
      id: 'logout',
      order: 100,
      title: t('menu.userMenu.logout'),
      icon: CORE_ICON.logout,
      link: { name: 'logout' },
    },
  ]
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
  closeDropdown()
  await userStore.logout()
}

async function handleTrailingAction(item) {
  if (!item.trailingAction?.onClick) {
    return
  }

  try {
    // Передаём роутер приложения: обработчики модулей живут вне setup
    // и не могут надёжно получить его сами (useRouter недоступен).
    await item.trailingAction.onClick({ router })
  } catch (error) {
    logError('Ошибка действия пункта меню:', error)
  }

  closeDropdown()
}

onMounted(async () => {
  if (!userStore.isInitialized) {
    await userStore.ensureUserReady()
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
    <button
      type="button"
      class="user-menu-trigger"
      :class="{
        'user-menu-trigger--open': isOpen,
        'user-menu-trigger--name-hidden': !props.showName,
      }"
      :aria-label="`${t('menu.userMenu.ariaLabel')}: ${userName}`"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      @click.stop="toggleDropdown"
    >
      <span class="user-menu-trigger__avatar" aria-hidden="true">
        <UserAvatar
          :size="avatarSize"
          :clickable="false"
          :title="userName"
          show-online-status
        />
      </span>
      <span
        class="user-menu-trigger__name"
        :class="{ 'user-menu-trigger__name--hidden': !props.showName }"
      >
        <span class="user-menu-trigger__name-inner">
          <span class="user-menu-trigger__fio" :title="userName">{{ userNameTruncated }}</span>
        </span>
      </span>
    </button>
    <Transition name="dropdown-left">
      <ul v-if="isOpen" class="user-dropdown-menu" role="menu" :aria-label="t('menu.userMenu.ariaLabel')">
      <li class="dropdown-header px-3 py-2 border-bottom">
        <div class="d-flex align-items-center">
          <div class="me-2">
            <UserAvatar :size="32" :title="userName" />
          </div>
          <div class="flex-grow-1 min-width-0">
            <div class="fw-semibold text-truncate">{{ userName }}</div>
            <small class="text-muted text-truncate d-block">{{ userEmail }}</small>
          </div>
        </div>
        <div v-if="userStore.isLoading" class="mt-1 text-muted small" role="status" aria-live="polite">
          {{ t('menu.userMenu.loading') }}
        </div>
      </li>
      <li v-for="(item, index) in menuItems" :key="item.id">
        <button v-if="item.link?.name === 'logout'" type="button" class="dropdown-item header-dropdown-item w-100 text-start" :style="{ transitionDelay: `${(index + 1) * 50}ms` }" @click="handleLogout">
          <span class="icon-flex">
            <LucideIcon :name="item.icon" :size="22" />
          </span>
          <span>{{ item.title }}</span>
        </button>
        <div v-else-if="item.trailingAction" class="user-menu-item-row" :style="{ transitionDelay: `${(index + 1) * 50}ms` }">
          <RouterLink :to="item.link" class="dropdown-item header-dropdown-item user-menu-item-row__link" active-class="active" @click="closeDropdown">
            <span class="icon-flex">
              <LucideIcon :name="item.icon" :size="22" />
            </span>
            <span>{{ item.title }}</span>
          </RouterLink>
          <HoverTooltip :text="item.trailingAction.title">
            <button
              type="button"
              class="user-menu-item-trailing"
              :aria-label="item.trailingAction.title"
              @click.stop="handleTrailingAction(item)"
            >
              <LucideIcon :name="item.trailingAction.icon" :size="18" />
            </button>
          </HoverTooltip>
        </div>
        <RouterLink v-else :to="item.link" class="dropdown-item header-dropdown-item" active-class="active" :style="{ transitionDelay: `${(index + 1) * 50}ms` }" @click="closeDropdown">
          <span class="icon-flex">
            <LucideIcon :name="item.icon" :size="22" />
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
  display: block;
  min-width: 0;
  width: 100%;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  padding: 2px 8px 2px 2px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  appearance: none;
  cursor: pointer;
  overflow: visible;
  transition: background-color 0.2s ease, padding 0.2s ease;

  &:hover,
  &--open {
    background-color: var(--color-hover-background);
  }

  &--name-hidden {
    padding-right: 2px;
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--bs-primary-rgb), 0.85);
    outline-offset: 2px;
  }
}

.user-menu-trigger__avatar {
  position: relative;
  flex-shrink: 0;
  width: var(--toolbar-avatar-size, 40px);
  height: var(--toolbar-avatar-size, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: transparent;
  overflow: visible;
  // Раньше серый фон обёртки давал «кольцо»; теперь явная обводка в цвет темы.
  box-shadow: 0 0 0 1px var(--color-border, var(--ui-border, #dee2e6));
  transition: width 0.2s ease, height 0.2s ease;

  :deep(.user-avatar-wrap) {
    overflow: visible;
  }

  :deep(.user-avatar) {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
  }

  :deep(.user-avatar-image) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  // Тулбар на secondary-фоне — кольцо PresenceIndicator под него, не под primary.
  :deep(.presence-indicator) {
    border-color: var(--color-secondary-background);
    z-index: 2;
  }
}

.user-menu-trigger__name {
  display: grid;
  grid-template-columns: 1fr;
  min-width: 0;
  overflow: hidden;
  transition: grid-template-columns var(--menu-label-transition, #{$menu-collapsed-peek-transition});

  &--hidden {
    grid-template-columns: 0fr;
    pointer-events: none;
  }
}

.user-menu-trigger__name-inner {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.user-menu-trigger__fio {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: left;
}

.user-dropdown-menu {
  @include dropdown-menu-base;
  left: 0;
  transform: translate(0, -8px);
  min-width: min(280px, calc(100vw - 1rem));
  max-width: min(320px, calc(100vw - 1rem));
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

.dropdown-header :deep(.user-avatar-image) {
  border-width: 1px;
}

.user-menu-item-row {
  display: flex;
  align-items: stretch;

  :deep(.hover-tooltip) {
    flex-shrink: 0;
    align-self: stretch;
  }
}

.user-menu-item-row__link {
  flex: 1;
  min-width: 0;
}

.user-menu-item-trailing {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  margin: 0;
  border: none;
  background: transparent;
  color: var(--bs-secondary-color);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: var(--bs-danger-bg-subtle, #f8d7da);
    color: var(--bs-danger);
  }

  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--bs-danger-bg-subtle, #f8d7da);
  }
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
