<template>
  <div
    class="menu-toolbar"
    :class="{ 'menu-toolbar--compact': isCompact }"
  >
    <div id="menu-toolbar-content" ref="toolsRef" class="tools">
      <div class="toolbar__user">
        <UserMenu
          ref="userMenuRef"
          :show-name="shouldShowFullInfo"
          :compact="isCompact"
          @dropdown-toggle="(active) => setDropdownActive('userMenu', active)"
        />
      </div>
      <div
        class="menu-toolbar__sync-fade menu-toolbar__sync-fade--actions"
        :class="{
          hidden: !shouldShowFullInfo,
          'menu-toolbar__sync-fade--allow-overflow': actionsAllowOverflow,
        }"
      >
        <div class="menu-toolbar__sync-inner tools-buttons">
          <div class="tools__apps">
            <AppsMenu
              ref="appsMenuRef"
              :icon-size="toolbarIconSize"
              @dropdown-toggle="(active) => setDropdownActive('apps', active)"
              @visibility-change="onAppsVisibilityChange"
            />
          </div>
          <div class="tools__notifications">
            <SidebarNotifications
              ref="notificationsMenuRef"
              :icon-size="toolbarIconSize"
              @dropdown-toggle="(active) => setDropdownActive('notifications', active)"
            />
          </div>
          <div class="tools__settings">
            <SettingsMenu
              ref="settingsMenuRef"
              :icon-size="toolbarIconSize"
              @dropdown-toggle="(active) => setDropdownActive('settings', active)"
              @open-user-settings="openUserSettingsModal('profile')"
            />
          </div>
        </div>
      </div>
    </div>

    <UserSettingsModal
      v-if="userSettingsMounted"
      :show="showUserSettingsModal"
      :initial-tab="userSettingsInitialTab"
      @close="closeUserSettingsModal"
    />
  </div>
</template>

<script setup>
import UserMenu from '@/components/header/UserMenu.vue'
import SettingsMenu from '@/components/menu/SettingsMenu.vue'
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { initUserSettings } from '@/core/cms/js/uiSettings.js'

const AppsMenu = defineAsyncComponent(() => import('@/components/menu/AppsMenu.vue'))
const SidebarNotifications = defineAsyncComponent(() =>
  import('@/components/menu/SidebarNotifications.vue'),
)
const UserSettingsModal = defineAsyncComponent(() =>
  import('@/core/cms/adp/user/account/component/UserSettingsModal.vue'),
)

const ACTION_GAP_PX = 4
const USER_GAP_PX = 8
const MIN_NAME_PX = 64
const BTN_COMFORTABLE_PX = 32
const AVATAR_COMFORTABLE_PX = 40
const TRIGGER_PAD_WITH_NAME_PX = 10
const TRIGGER_PAD_AVATAR_ONLY_PX = 4
/** Запас при входе в compact — чуть раньше, чем полный упор. */
const SLACK_ENTER_PX = 4
/** Гистерезис выхода из compact — чтобы не мигать на границе. */
const SLACK_EXIT_PX = 28

const props = defineProps({
  isCollapsed: {
    type: Boolean,
    default: false,
  },
  isHovering: {
    type: Boolean,
    default: false,
  },
  isLayoutSync: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['dropdown-state-change'])

const userStore = useUserStore()
const router = useRouter()
const toolsRef = ref(null)
const userMenuRef = ref(null)
const notificationsMenuRef = ref(null)
const appsMenuRef = ref(null)
const settingsMenuRef = ref(null)
const showUserSettingsModal = ref(false)
const userSettingsMounted = ref(false)
const userSettingsInitialTab = ref('profile')
const isCompact = ref(false)
const appsVisible = ref(false)

let resizeObserver = null

const toolbarIconSize = computed(() => (isCompact.value ? 18 : 20))

function openUserSettingsModal(tab = 'profile') {
  if (!userStore.isAuthenticated) {
    router.push({ name: 'Login' })
    return
  }
  userSettingsInitialTab.value = tab || 'profile'
  userSettingsMounted.value = true
  showUserSettingsModal.value = true
}

function closeUserSettingsModal() {
  showUserSettingsModal.value = false
  userSettingsInitialTab.value = 'profile'
}

function onOpenUserSettingsEvent(event) {
  const tab = event?.detail?.tab || 'profile'
  openUserSettingsModal(tab)
}

function actionButtonsWidth(btnSize, count) {
  if (count <= 0) {
    return 0
  }
  return count * btnSize + (count - 1) * ACTION_GAP_PX
}

function updateCompactMode() {
  const el = toolsRef.value
  if (!el) {
    return
  }

  const available = el.clientWidth
  const btnCount = 2 + (appsVisible.value ? 1 : 0)
  const showName = shouldShowFullInfo.value
  const minName = showName ? MIN_NAME_PX : 0
  const userGap = showName ? USER_GAP_PX : 0
  const triggerPad = showName ? TRIGGER_PAD_WITH_NAME_PX : TRIGGER_PAD_AVATAR_ONLY_PX

  // Flex сжимает ФИО раньше кнопок — смотрим реальный слот имени, а не только clientWidth ряда.
  const nameEl = showName ? el.querySelector('.user-menu-trigger__name') : null
  const nameWidth = nameEl ? nameEl.clientWidth : minName
  const nameTooTight = showName && nameWidth > 0 && nameWidth < MIN_NAME_PX

  // AppsMenu (3 action-кнопки) — основной кейс compact; иначе — по нехватке места под ФИО.
  const manyActions = btnCount >= 3

  const needComfortable =
    AVATAR_COMFORTABLE_PX +
    userGap +
    minName +
    triggerPad +
    actionButtonsWidth(BTN_COMFORTABLE_PX, btnCount)

  const shouldCompact =
    manyActions ||
    nameTooTight ||
    available < needComfortable + SLACK_ENTER_PX

  if (!isCompact.value) {
    if (shouldCompact) {
      isCompact.value = true
    }
    return
  }

  // Выходим из compact только без Apps и при запасе ширины (гистерезис).
  if (
    !manyActions &&
    !nameTooTight &&
    available >= needComfortable + SLACK_EXIT_PX
  ) {
    isCompact.value = false
  }
}

function onAppsVisibilityChange(visible) {
  appsVisible.value = Boolean(visible)
  nextTick(updateCompactMode)
}

function bindToolsObserver() {
  resizeObserver?.disconnect()
  resizeObserver = null
  const el = toolsRef.value
  if (!el || typeof ResizeObserver === 'undefined') {
    updateCompactMode()
    return
  }
  resizeObserver = new ResizeObserver(() => {
    updateCompactMode()
  })
  resizeObserver.observe(el)
  updateCompactMode()
}

onMounted(() => {
  window.addEventListener('ergo:open-user-settings', onOpenUserSettingsEvent)
  nextTick(bindToolsObserver)
})

onUnmounted(() => {
  window.removeEventListener('ergo:open-user-settings', onOpenUserSettingsEvent)
  resizeObserver?.disconnect()
  resizeObserver = null
})

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

watch(shouldShowFullInfo, () => {
  nextTick(updateCompactMode)
})

// В peek-режиме колонка 0fr→1fr анимируется: overflow:visible показывал кнопки раньше слота.
// Разрешаем overflow только когда меню полностью развёрнуто (без layout-sync) или открыт dropdown.
const actionsAllowOverflow = computed(() => {
  if (hasActiveDropdown.value) {
    return true
  }

  return !props.isCollapsed && !props.isLayoutSync
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
@media (width >= $ui-shell-desktop-min) {
  .header__menu {
    display: none;
  }
}

.menu-toolbar {
  --toolbar-btn-size: 32px;
  --toolbar-icon-size: 20px;
  --toolbar-avatar-size: 40px;

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
  padding: 8px;
  border-radius: 8px;

  &--compact {
    --toolbar-btn-size: 28px;
    --toolbar-icon-size: 18px;
    --toolbar-avatar-size: 36px;
  }

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
  flex: 1;
  min-width: 0;
}

.tools-buttons {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  align-items: center;
  flex-shrink: 0;

  :deep(.header-btn) {
    box-sizing: border-box;
    width: var(--toolbar-btn-size);
    height: var(--toolbar-btn-size);
    padding: 0;
    transition: width 0.2s ease, height 0.2s ease, background-color 0.2s ease;
  }
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

</style>
