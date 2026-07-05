<template>
  <div class="menu-toolbar">
    <div id="menu-toolbar-content" class="tools">
      <div class="toolbar__user">
        <div class="tools__user__avatar">
          <UserMenu ref="userMenuRef" @dropdown-toggle="(active) => setDropdownActive('userMenu', active)" />
        </div>
        <div
          class="tools__user__name menu-toolbar__sync-fade"
          :class="{ hidden: !shouldShowFullInfo }"
        >
          <div class="menu-toolbar__sync-inner">
            <div class="user__fullname" :title="userStore.menuUserName">{{ userStore.menuUserNameTruncated }}</div>
          </div>
        </div>
      </div>
      <div
        class="menu-toolbar__sync-fade menu-toolbar__sync-fade--actions"
        :class="{
          hidden: !shouldShowFullInfo,
          'menu-toolbar__sync-fade--allow-overflow': actionsAllowOverflow,
        }"
      >
        <div class="menu-toolbar__sync-inner tools-buttons">
          <div class="tools__notifications">
            <SidebarNotifications v-if="actionButton === 'notifications'" ref="notificationsMenuRef" @dropdown-toggle="(active) => setDropdownActive('notifications', active)"/>
            <AppsMenu v-else ref="appsMenuRef" @dropdown-toggle="(active) => setDropdownActive('apps', active)"/>
          </div>
          <div class="tools__settings">
            <SettingsMenu ref="settingsMenuRef" @dropdown-toggle="(active) => setDropdownActive('settings', active)" @open-user-settings="showUserSettingsModal = true"/>
          </div>
        </div>
      </div>
    </div>

    <UserSettingsModal :show="showUserSettingsModal" @close="showUserSettingsModal = false" />
  </div>
</template>

<script setup>
import UserMenu from '@/components/header/UserMenu.vue'
import SidebarNotifications from '@/components/menu/SidebarNotifications.vue'
import AppsMenu from '@/components/menu/AppsMenu.vue'
import SettingsMenu from '@/components/menu/SettingsMenu.vue'
import UserSettingsModal from '@/core/cms/adp/user/account/component/UserSettingsModal.vue'
import { computed, ref, watch } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { useUiSettings, initUserSettings } from '@/core/cms/js/uiSettings.js'

const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false,
  },
  isHovering: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['dropdown-state-change'])

const userStore = useUserStore()
const userMenuRef = ref(null)
const notificationsMenuRef = ref(null)
const appsMenuRef = ref(null)
const settingsMenuRef = ref(null)
const showUserSettingsModal = ref(false)

const { actionButton } = useUiSettings()

watch(
  () => userStore.user?.id,
  (userId) => initUserSettings(userId ?? null),
  { immediate: true },
)

const activeDropdowns = ref(new Set())
const hasActiveDropdown = ref(false)

const shouldShowFullInfo = computed(() => {
  return !props.isCollapsed || props.isHovering
})

// В peek-режиме колонка 0fr→1fr анимируется: overflow:visible показывал кнопки раньше слота.
// Разрешаем overflow только в развёрнутом меню или при открытом dropdown.
const actionsAllowOverflow = computed(() => {
  if (!props.isCollapsed) {
    return true
  }
  return hasActiveDropdown.value
})

const setDropdownActive = (dropdownId, active) => {
  if (active) {
    const allMenus = [
      { id: 'userMenu', ref: userMenuRef },
      { id: 'notifications', ref: notificationsMenuRef },
      { id: 'apps', ref: appsMenuRef },
      { id: 'settings', ref: settingsMenuRef }
    ]

    allMenus.forEach(({ id, ref }) => {
      if (id !== dropdownId && ref.value?.closeDropdown) {
        ref.value.closeDropdown()
      }
    })

    activeDropdowns.value.add(dropdownId)
  } else {
    activeDropdowns.value.delete(dropdownId)
  }

  hasActiveDropdown.value = activeDropdowns.value.size > 0
  emit('dropdown-state-change', hasActiveDropdown.value)
}
</script>

<style scoped lang="scss">
@media (width >= 1200px) {
  .header__menu {
    display: none;
  }
}

.menu-toolbar {
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
  overflow: visible;
  background-color: var(--color-secondary-background);
  margin-block: 0 $padding-internal;
  margin-inline: 2%;
  width: auto;
  height: auto;
  padding: 8px 12px;
  border-radius: 8px;

  .tools {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
}

.toolbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tools__user__name {
  min-width: 0;
}

.user__fullname {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.tools-buttons {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;
}

// Раскрытие по натуральной ширине (0fr → 1fr) синхронно с шириной меню,
// без max-width-скачка и без опережающего opacity.
.menu-toolbar__sync-fade {
  display: grid;
  grid-template-columns: 1fr;
  min-width: 0;
  overflow: hidden;
  transition: grid-template-columns var(--menu-label-transition, #{$menu-collapsed-peek-transition});

  &.hidden {
    grid-template-columns: 0fr;
    pointer-events: none;
  }

  &--actions {
    overflow: hidden;
  }

  // Dropdown вверх — только когда overflow не ломает синхрон с анимацией ширины.
  &--actions.menu-toolbar__sync-fade--allow-overflow:not(.hidden) {
    overflow: visible;

    .menu-toolbar__sync-inner.tools-buttons {
      overflow: visible;
    }
  }
}

.menu-toolbar__sync-inner {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.tools__user__avatar {
  cursor: pointer;
  background-color: grey;
  border-radius: 50%;
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 3px;
    width: 8px;
    height: 8px;
    border-radius: 100%;
    box-shadow: 0 0 0 2px var(--color-primary-background);
    background-color: #4caf50;
    z-index: 1;
  }

  :deep(.user-menu-wrapper) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :deep(.tools__avatar) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    overflow: hidden;
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
}
</style>
