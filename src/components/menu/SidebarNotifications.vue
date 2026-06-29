<script setup>
import { Bell, CheckCheck } from 'lucide-vue-next'
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDropdown } from '@/composables/useDropdown.js'
import { useNotificationsInbox } from '@/core/notifications/js/useNotificationsInbox.js'
import { resolveNotificationIconName } from '@/core/notifications/js/icon-resolver.js'
import NotificationActions from '@/core/notifications/components/NotificationActions.vue'
import { moduleManager } from '@/modules/index.js'
import { formatDateTime } from '@/js/utils/timeUtils.js'

const HOVER_READ_DELAY_MS = 1000

const emit = defineEmits(['dropdown-toggle'])
const router = useRouter()
const { dropdownRef, isOpen, toggleDropdown, closeDropdown } = useDropdown(emit)

const {
  sidebarItems,
  unreadCount,
  sidebarLoading,
  hasUnread,
  ensureInitialized,
  loadSidebar,
  markRead,
  markAllRead,
} = useNotificationsInbox()

const hoverReadTimers = new Map()

defineExpose({ closeDropdown })

onMounted(() => {
  ensureInitialized()
})

onUnmounted(() => {
  clearAllHoverTimers()
})

watch(isOpen, (open) => {
  if (!open) clearAllHoverTimers()
})

function clearAllHoverTimers() {
  hoverReadTimers.forEach((timerId) => clearTimeout(timerId))
  hoverReadTimers.clear()
}

function clearHoverTimer(id) {
  const timerId = hoverReadTimers.get(id)
  if (timerId !== undefined) {
    clearTimeout(timerId)
    hoverReadTimers.delete(id)
  }
}

function onItemHoverStart(item) {
  if (item.is_read) return
  clearHoverTimer(item.id)
  hoverReadTimers.set(
    item.id,
    setTimeout(() => {
      hoverReadTimers.delete(item.id)
      markRead(item.id)
    }, HOVER_READ_DELAY_MS),
  )
}

function onItemHoverEnd(item) {
  clearHoverTimer(item.id)
}

const formatBadge = (count) => (count > 99 ? '99+' : String(count))

function formatNotificationDate(value) {
  if (!value) return ''
  const formatted = formatDateTime(value)
  return formatted === '—' ? '' : formatted
}

function readAtTooltip(item) {
  if (item.is_read && item.read_at) {
    return `Прочитано: ${formatNotificationDate(item.read_at)}`
  }
  return 'Не прочитано'
}

function levelClass(level) {
  switch (level) {
    case 'success': return 'level--success'
    case 'warning': return 'level--warning'
    case 'error': return 'level--error'
    default: return 'level--info'
  }
}

function iconFor(item) {
  const name = resolveNotificationIconName(item)
  const icon = moduleManager?.icons?.getIcon?.(name)
  return icon || Bell
}

async function activate(notification) {
  if (notification?.actions_state === 'pending' && Array.isArray(notification?.actions) && notification.actions.length) {
    return
  }
  await markRead(notification.id)

  if (notification.route?.name) {
    router.push({ name: notification.route.name, params: notification.route.params || {} })
    closeDropdown()
    return
  }
  if (notification.link_url) {
    if (/^https?:\/\//i.test(notification.link_url)) {
      window.open(notification.link_url, '_blank', 'noopener')
    } else {
      router.push(notification.link_url)
    }
    closeDropdown()
  }
}

function handleToggle() {
  toggleDropdown()
  if (isOpen.value) {
    loadSidebar()
  }
}

function goToFullList() {
  closeDropdown()
  router.push({ name: 'UserNotifications' })
}
</script>

<template>
  <div ref="dropdownRef" class="tools__notifications-wrapper">
    <div @click.stop="handleToggle" class="header-btn notifications-btn" :class="{ 'has-unread': hasUnread }" v-tooltip title="Уведомления">
      <Bell :size="20" />
      <span v-if="hasUnread" class="notifications-badge">{{ formatBadge(unreadCount) }}</span>
    </div>

    <Transition name="dropdown">
      <div v-if="isOpen" class="notifications-dropdown">
        <div class="notifications-dropdown__header">
          <button type="button" class="notifications-dropdown__title-link" @click="goToFullList" title="Открыть страницу уведомлений">
            <span>Уведомления</span>
          </button>
          <button v-if="hasUnread" class="notifications-dropdown__action" type="button" @click="markAllRead" title="Отметить все прочитанными">
            <CheckCheck :size="16" />
            <span>Прочитать все</span>
          </button>
        </div>

        <div v-if="sidebarLoading && sidebarItems.length === 0" class="notifications-dropdown__state">
          Загрузка...
        </div>
        <div v-else-if="sidebarItems.length === 0" class="notifications-dropdown__state text-muted">
          Пока нет уведомлений
        </div>

        <ul v-else class="notifications-list">
          <li v-for="item in sidebarItems" :key="item.id" class="notifications-item" :class="[levelClass(item.level), { 'is-unread': !item.is_read }]" @click="activate(item)" @mouseenter="onItemHoverStart(item)" @mouseleave="onItemHoverEnd(item)">
            <div class="notifications-item__icon" :class="levelClass(item.level)">
              <component :is="iconFor(item)" :size="18" />
            </div>
            <div class="notifications-item__content">
              <div class="notifications-item__title">{{ item.title }}</div>
              <div v-if="item.body" class="notifications-item__body">{{ item.body }}</div>
              <NotificationActions :notification="item" compact @click.stop />
              <div class="notifications-item__meta">
                <span v-if="item.source_module" class="notifications-item__source">
                  {{ item.source_module }}
                </span>
                <span class="notifications-item__date" v-tooltip :title="readAtTooltip(item)">{{ formatNotificationDate(item.created_at) }}</span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.tools__notifications-wrapper {
  position: relative;
  display: inline-block;
}

.notifications-btn {
  position: relative;
}

.notifications-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--bs-danger, #dc3545);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  pointer-events: none;
}

.notifications-dropdown {
  @include dropdown-menu-base;
  left: 50%;
  transform: translate(-50%, -8px);
  width: 360px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.notifications-dropdown__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border, #dee2e6);
  background-color: var(--color-secondary-background, #f8f9fa);
}

.notifications-dropdown__title-link {
  display: inline-flex;
  align-items: center;
  border: none;
  background: transparent;
  padding: 4px 6px;
  margin-left: -6px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-primary-text);
  cursor: pointer;
  text-align: left;

  &:hover {
    color: var(--bs-primary, #0d6efd);
    background-color: var(--color-hover-background);
  }

  &:focus-visible {
    outline: 2px solid var(--bs-primary, #0d6efd);
    outline-offset: 2px;
  }
}

.notifications-dropdown__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--bs-primary, #0d6efd);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;

  &:hover { background-color: var(--color-hover-background); }
}

.notifications-dropdown__state {
  padding: 1.5rem;
  text-align: center;
  font-size: 0.875rem;
}

.notifications-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1 1 auto;
}

.notifications-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 1rem 0.75rem 1.25rem;
  border-bottom: 1px solid var(--color-border, #dee2e6);
  cursor: pointer;
  transition: background-color 0.15s ease;
  position: relative;

  &:last-child { border-bottom: none; }
  &:hover { background-color: var(--color-hover-background); }

  &.is-unread {
    background-color: var(--color-secondary-background, #f8f9fa);

    .notifications-item__title { font-weight: 600; }

    &::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--bs-primary, #0d6efd);
      z-index: 1;
    }
  }

  &.level--success::after,
  &.level--warning::after,
  &.level--error::after,
  &.level--info::after {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0; width: 3px;
  }
  &.level--success::after { background: var(--bs-success, #198754); }
  &.level--warning::after { background: var(--bs-warning, #ffc107); }
  &.level--error::after   { background: var(--bs-danger, #dc3545); }
  &.level--info::after    { background: var(--bs-info, #0dcaf0); }
}

.notifications-item__icon {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-secondary-background, #f8f9fa);
  border: 1px solid var(--color-border, #dee2e6);
  color: var(--color-primary-text);

  &.level--success {
    color: var(--bs-success, #198754);
    border-color: var(--bs-success-border-subtle, rgba(25, 135, 84, 0.25));
    background-color: var(--bs-success-bg-subtle, rgba(25, 135, 84, 0.08));
  }
  &.level--warning {
    color: var(--bs-warning-text-emphasis, #997404);
    border-color: var(--bs-warning-border-subtle, rgba(255, 193, 7, 0.3));
    background-color: var(--bs-warning-bg-subtle, rgba(255, 193, 7, 0.1));
  }
  &.level--error {
    color: var(--bs-danger, #dc3545);
    border-color: var(--bs-danger-border-subtle, rgba(220, 53, 69, 0.25));
    background-color: var(--bs-danger-bg-subtle, rgba(220, 53, 69, 0.08));
  }
  &.level--info {
    color: var(--bs-primary, #0d6efd);
    border-color: var(--bs-primary-border-subtle, rgba(13, 110, 253, 0.25));
    background-color: var(--bs-primary-bg-subtle, rgba(13, 110, 253, 0.08));
  }
}

.notifications-item__content {
  flex: 1 1 auto;
  min-width: 0;
}

.notifications-item__title {
  font-size: 0.875rem;
  color: var(--color-primary-text);
  margin-bottom: 2px;
  line-height: 1.3;
}

.notifications-item__body {
  font-size: 0.8rem;
  color: var(--color-secondary-text, #6c757d);
  line-height: 1.4;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notifications-item__meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 4px;
  font-size: 0.7rem;
  color: var(--color-secondary-text, #6c757d);
}

.notifications-item__source {
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.04em;
}
</style>

<style lang="scss">
.notifications-dropdown.dropdown-enter-active,
.notifications-dropdown.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.notifications-dropdown.dropdown-enter-from {
  opacity: 0;
  transform: translate(-50%, -16px) !important;
}
.notifications-dropdown.dropdown-enter-to {
  opacity: 1;
  transform: translate(-50%, -8px) !important;
}
.notifications-dropdown.dropdown-leave-from {
  opacity: 1;
  transform: translate(-50%, -8px) !important;
}
.notifications-dropdown.dropdown-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px) !important;
}
</style>
