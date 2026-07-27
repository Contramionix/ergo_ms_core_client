<script setup>
import { Bell, BellOff, CheckCheck } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDropdown } from '@/composables/useDropdown.js'
import { useNotificationsInbox } from '@/core/notifications/js/useNotificationsInbox.js'
import { groupNotificationsByDate } from '@/core/notifications/js/groupByDate.js'
import NotificationItem from '@/core/notifications/components/NotificationItem.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const HOVER_READ_DELAY_MS = 1000
const PANEL_ID = 'sidebar-notifications-panel'

const { t } = useAppI18n()
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
  archive,
  hideFromSidebar,
  softDelete,
} = useNotificationsInbox()

const hoverReadTimers = new Map()

const groupedItems = computed(() => groupNotificationsByDate(sidebarItems.value))

const badgeLabel = computed(() => {
  const count = unreadCount.value
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
})

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

function onActivate() {
  closeDropdown()
}

async function onArchive(id) {
  await archive(id)
}

async function onHideSidebar(id) {
  await hideFromSidebar(id)
}

async function onDelete(id) {
  await softDelete(id)
}
</script>

<template>
  <div ref="dropdownRef" class="tools__notifications-wrapper">
    <HoverTooltip :text="t('menu.notifications.title')">
      <button
        type="button"
        class="header-btn notifications-btn"
        :class="{ 'has-unread': hasUnread }"
        :aria-expanded="isOpen"
        :aria-controls="PANEL_ID"
        aria-haspopup="true"
        :aria-label="t('menu.notifications.title')"
        @click.stop="handleToggle"
      >
        <LucideIcon name="Bell" :size="20" />
        <span
          v-if="hasUnread"
          class="notifications-badge"
          aria-live="polite"
        >{{ badgeLabel }}</span>
      </button>
    </HoverTooltip>

    <Transition name="dropdown">
      <div
        v-if="isOpen"
        :id="PANEL_ID"
        class="notifications-dropdown"
        role="dialog"
        :aria-label="t('menu.notifications.title')"
      >
        <div class="notifications-dropdown__header">
          <button
            type="button"
            class="notifications-dropdown__title-link"
            :title="t('menu.notifications.openPage')"
            @click="goToFullList"
          >
            <span>{{ t('menu.notifications.title') }}</span>
          </button>
          <button
            v-if="hasUnread"
            class="notifications-dropdown__action"
            type="button"
            :title="t('settings.notifications.markAllRead')"
            @click="markAllRead()"
          >
            <CheckCheck :size="16" aria-hidden="true" />
            <span>{{ t('menu.notifications.markAllRead') }}</span>
          </button>
        </div>

        <div class="notifications-dropdown__body">
          <LoadingContentArea :loading="sidebarLoading" min-height="6rem">
            <div v-if="sidebarItems.length === 0" class="notifications-dropdown__state">
              <BellOff :size="28" class="notifications-dropdown__empty-icon" aria-hidden="true" />
              <p>{{ t('menu.notifications.empty') }}</p>
            </div>

            <div v-else class="notifications-dropdown__scroll">
              <template v-for="group in groupedItems" :key="group.key">
                <div class="notifications-dropdown__group-label">{{ group.label }}</div>
                <ul class="notifications-list">
                  <NotificationItem
                    v-for="item in group.items"
                    :key="item.id"
                    :notification="item"
                    compact
                    show-sidebar-hide
                    :date-style="group.key === 'today' || group.key === 'yesterday' ? 'time' : group.key === 'week' ? 'weekday' : 'full'"
                    @activate="onActivate"
                    @mark-read="markRead"
                    @archive="onArchive"
                    @hide-sidebar="onHideSidebar"
                    @delete="onDelete"
                    @hover-start="onItemHoverStart"
                    @hover-end="onItemHoverEnd"
                  />
                </ul>
              </template>
            </div>
          </LoadingContentArea>
        </div>

        <div class="notifications-dropdown__footer">
          <button type="button" class="notifications-dropdown__footer-link" @click="goToFullList">
            <Bell :size="14" aria-hidden="true" />
            {{ t('menu.notifications.viewAll') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.tools__notifications-wrapper {
  position: relative;
  display: inline-block;
  padding-top: 4px;
  padding-right: 4px;
  margin-top: -4px;
  margin-right: -4px;
}

.notifications-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background-color: transparent;
  cursor: pointer;
  color: inherit;
  border-radius: 6px;
  transition: background-color 0.2s ease;

  // Scoped background перекрывает глобальный .header-btn:hover — повторяем здесь.
  &:hover,
  &[aria-expanded='true'] {
    background-color: var(--color-hover-background);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 2px;
  }
}

.notifications-badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--bs-danger);
  color: var(--bs-white, #fff);
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
  max-width: min(360px, 90vw);
  max-height: min(70dvh, calc(100dvh - 7rem));
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  background-color: var(--ui-surface);
  border: 1px solid var(--ui-border);
}

.notifications-dropdown__header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ui-border);
  background-color: var(--ui-surface-2);
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
  color: var(--ui-text);
  cursor: pointer;
  text-align: left;

  &:hover {
    color: var(--color-accent, var(--bs-primary));
    background-color: var(--color-hover-background, var(--ui-surface));
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 2px;
  }
}

.notifications-dropdown__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--color-accent, var(--bs-primary));
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  min-height: 32px;

  &:hover {
    background-color: var(--color-hover-background, var(--ui-surface));
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 2px;
  }
}

.notifications-dropdown__body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.loading-content-area--content),
  :deep(.loading-content-area__slot) {
    min-height: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }

  :deep(.loading-content-area__slot) {
    overflow: hidden;
  }
}

.notifications-dropdown__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.notifications-dropdown__group-label {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.4rem 1rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ui-text-muted);
  background-color: var(--ui-surface-2);
  border-bottom: 1px solid var(--ui-border);
}

.notifications-dropdown__state {
  padding: 1.5rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--ui-text-muted);

  p {
    margin: 0.5rem 0 0;
  }
}

.notifications-dropdown__empty-icon {
  opacity: 0.5;
  color: var(--ui-text-muted);
}

.notifications-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notifications-dropdown__footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--ui-border);
  background-color: var(--ui-surface-2);
  padding: 0.5rem;
}

.notifications-dropdown__footer-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  min-height: 36px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-accent, var(--bs-primary));
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background-color: var(--color-hover-background, var(--ui-surface));
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 2px;
  }
}
</style>

<style lang="scss">
.notifications-dropdown.dropdown-enter-active,
.notifications-dropdown.dropdown-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

@media (prefers-reduced-motion: reduce) {
  .notifications-dropdown.dropdown-enter-active,
  .notifications-dropdown.dropdown-leave-active {
    transition: none;
  }
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
