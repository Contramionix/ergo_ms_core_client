<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Archive,
  ArchiveRestore,
  Bell,
  Check,
  EyeOff,
  ExternalLink,
  Trash2,
} from 'lucide-vue-next'
import { moduleManager } from '@/modules/index.js'
import { resolveNotificationIconName } from '@/core/notifications/js/icon-resolver.js'
import NotificationActions from '@/core/notifications/components/NotificationActions.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { formatDateTime, getRelativeTime } from '@/js/utils/timeUtils.js'
import { confirmDelete } from '@/js/utils/confirm.js'

const { t } = useAppI18n()

const props = defineProps({
  notification: {
    type: Object,
    required: true,
  },
  /** compact — колокольчик; default — страница истории */
  compact: {
    type: Boolean,
    default: false,
  },
  highlighted: {
    type: Boolean,
    default: false,
  },
  showSidebarHide: {
    type: Boolean,
    default: false,
  },
  archivedView: {
    type: Boolean,
    default: false,
  },
  relativeTime: {
    type: Boolean,
    default: false,
  },
  /**
   * Как показывать дату в списке:
   * time — только ЧЧ:ММ (группы «Сегодня» / «Вчера»);
   * weekday — день недели + время;
   * full — полная дата (по умолчанию).
   */
  dateStyle: {
    type: String,
    default: 'full',
    validator: (v) => ['time', 'weekday', 'full'].includes(v),
  },
})

const emit = defineEmits([
  'activate',
  'mark-read',
  'archive',
  'unarchive',
  'hide-sidebar',
  'delete',
  'hover-start',
  'hover-end',
])

const router = useRouter()
const expanded = ref(false)

const levelClass = computed(() => {
  switch (props.notification.level) {
    case 'success': return 'level--success'
    case 'warning': return 'level--warning'
    case 'error': return 'level--error'
    default: return 'level--info'
  }
})

const iconComponent = computed(() => {
  const name = resolveNotificationIconName(props.notification)
  return moduleManager?.icons?.getIcon?.(name) || Bell
})

const hasTarget = computed(() => {
  const item = props.notification
  if (item?.actions_state === 'pending' && Array.isArray(item?.actions) && item.actions.length) {
    return false
  }
  return Boolean(item?.route?.name) || Boolean(item?.link_url)
})

const sourceLabel = computed(() => {
  const item = props.notification
  if (!item?.source_module) return ''
  return item.module_label || item.source_module
})

function formatTimeOnly(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

function formatWeekdayTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

const formattedDate = computed(() => {
  if (props.relativeTime) {
    const relative = getRelativeTime(props.notification.created_at)
    if (relative) return relative
  }
  if (props.dateStyle === 'time') {
    return formatTimeOnly(props.notification.created_at)
  }
  if (props.dateStyle === 'weekday') {
    return formatWeekdayTime(props.notification.created_at)
  }
  const formatted = formatDateTime(props.notification.created_at)
  return formatted === '—' ? '' : formatted
})

const absoluteDateTooltip = computed(() => {
  const formatted = formatDateTime(props.notification.created_at)
  return formatted === '—' ? '' : formatted
})

const dateTooltip = computed(() => {
  const parts = [absoluteDateTooltip.value, readAtTooltip.value].filter(Boolean)
  return parts.join(' · ')
})

const readAtTooltip = computed(() => {
  if (props.notification.is_read && props.notification.read_at) {
    const formatted = formatDateTime(props.notification.read_at)
    return formatted === '—'
      ? t('settings.inbox.read')
      : t('settings.inbox.readAt', { time: formatted })
  }
  return t('settings.inbox.unread')
})

function onBodyClick() {
  if (props.notification.body) {
    expanded.value = !expanded.value
  }
}

async function navigate() {
  emit('activate', props.notification)
  emit('mark-read', props.notification.id)

  const item = props.notification
  if (item.route?.name) {
    await router.push({
      name: item.route.name,
      params: item.route.params || {},
    })
    return
  }
  if (item.link_url) {
    if (/^https?:\/\//i.test(item.link_url)) {
      window.open(item.link_url, '_blank', 'noopener')
    } else {
      await router.push(item.link_url)
    }
  }
}

function onMarkRead() {
  emit('mark-read', props.notification.id)
}

function onArchive() {
  emit('archive', props.notification.id)
}

function onUnarchive() {
  emit('unarchive', props.notification.id)
}

function onHideSidebar() {
  emit('hide-sidebar', props.notification.id)
}

async function onDelete() {
  const ok = await confirmDelete(
    t('settings.inbox.deleteTitle'),
    t('settings.inbox.deleteMessage'),
  )
  if (!ok) return
  emit('delete', props.notification.id)
}
</script>

<template>
  <li
    class="notif-item"
    :class="[
      levelClass,
      {
        'is-unread': !notification.is_read,
        'is-compact': compact,
        'is-page': !compact,
        'is-highlighted': highlighted,
        'is-expanded': expanded,
      },
    ]"
    :data-notification-id="notification.id"
    :aria-label="notification.is_read ? notification.title : `${notification.title}, ${t('settings.inbox.unreadSuffix')}`"
    @mouseenter="emit('hover-start', notification)"
    @mouseleave="emit('hover-end', notification)"
  >
    <div class="notif-item__icon" :class="levelClass" aria-hidden="true">
      <component :is="iconComponent" :size="compact ? 18 : 20" />
    </div>

    <div class="notif-item__body-col">
      <!-- Строка 1: заголовок + дата -->
      <div class="notif-item__top">
        <div class="notif-item__title" :title="notification.title">{{ notification.title }}</div>
        <HoverTooltip :text="dateTooltip">
          <time class="notif-item__date" :datetime="notification.created_at">
            {{ formattedDate }}
          </time>
        </HoverTooltip>
      </div>

      <!-- Строка 2: описание -->
      <button
        v-if="notification.body"
        type="button"
        class="notif-item__text"
        :class="{ 'is-clamped': !expanded }"
        @click.stop="onBodyClick"
      >
        {{ notification.body }}
      </button>

      <NotificationActions :notification="notification" :compact="compact" @click.stop />

      <!-- Строка 3: модуль + действия -->
      <div class="notif-item__bottom" @click.stop>
        <span v-if="sourceLabel" class="notif-item__source">{{ sourceLabel }}</span>
        <span v-else class="notif-item__source-spacer" aria-hidden="true" />

        <div class="notif-item__actions">
          <HoverTooltip v-if="hasTarget" :text="t('settings.inbox.open')">
            <button
              type="button"
              class="notif-item__action-btn"
              :aria-label="t('settings.inbox.open')"
              @click="navigate"
            >
              <ExternalLink :size="14" aria-hidden="true" />
            </button>
          </HoverTooltip>
          <HoverTooltip v-if="!notification.is_read" :text="t('settings.inbox.markRead')">
            <button
              type="button"
              class="notif-item__action-btn"
              :aria-label="t('settings.inbox.markRead')"
              @click="onMarkRead"
            >
              <Check :size="14" aria-hidden="true" />
            </button>
          </HoverTooltip>
          <HoverTooltip v-if="showSidebarHide" :text="t('settings.inbox.hideFromBell')">
            <button
              type="button"
              class="notif-item__action-btn"
              :aria-label="t('settings.inbox.hideFromBell')"
              @click="onHideSidebar"
            >
              <EyeOff :size="14" aria-hidden="true" />
            </button>
          </HoverTooltip>
          <HoverTooltip v-if="archivedView" :text="t('settings.inbox.restoreFromArchive')">
            <button
              type="button"
              class="notif-item__action-btn"
              :aria-label="t('settings.inbox.restoreFromArchive')"
              @click="onUnarchive"
            >
              <ArchiveRestore :size="14" aria-hidden="true" />
            </button>
          </HoverTooltip>
          <HoverTooltip v-else :text="t('settings.inbox.toArchive')">
            <button
              type="button"
              class="notif-item__action-btn"
              :aria-label="t('settings.inbox.toArchive')"
              @click="onArchive"
            >
              <Archive :size="14" aria-hidden="true" />
            </button>
          </HoverTooltip>
          <HoverTooltip :text="t('common.delete')">
            <button
              type="button"
              class="notif-item__action-btn notif-item__action-btn--danger"
              :aria-label="t('common.delete')"
              @click="onDelete"
            >
              <Trash2 :size="14" aria-hidden="true" />
            </button>
          </HoverTooltip>
        </div>
      </div>
    </div>
  </li>
</template>

<style scoped lang="scss">
.notif-item {
  /* Две колонки: иконка | контент (дата и действия внутри контента) */
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 0.75rem;
  align-items: start;
  padding: 0.75rem 1rem;
  position: relative;
  background-color: var(--ui-surface);
  border-bottom: 1px solid var(--ui-border);
  transition: background-color 0.15s ease;
  cursor: default;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    background-color: var(--color-hover-background, var(--ui-surface-2));
  }

  &.is-compact {
    align-items: center;
    padding: 0.75rem 0.875rem;
    column-gap: 0.625rem;
  }

  &.is-unread {
    background-color: var(--ui-surface-2);

    .notif-item__title {
      font-weight: 600;
    }

    &::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-accent, var(--bs-primary));
      z-index: 1;
    }
  }

  &.level--success::after,
  &.level--warning::after,
  &.level--error::after,
  &.level--info::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
  }

  &.level--success::after { background: var(--bs-success); }
  &.level--warning::after { background: var(--bs-warning); }
  &.level--error::after { background: var(--bs-danger); }
  &.level--info::after { background: var(--bs-info); }

  &.is-highlighted {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, var(--bs-primary)) 35%, transparent);
    animation: notif-highlight-fade 4s ease forwards;
  }
}

@keyframes notif-highlight-fade {
  0%, 60% {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent, var(--bs-primary)) 35%, transparent);
  }
  100% {
    box-shadow: 0 0 0 2px transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .notif-item.is-highlighted {
    animation: none;
  }
}

.notif-item__icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: var(--ui-surface-2);
  border: 1px solid var(--ui-border);
  color: var(--ui-text);

  &.level--success {
    color: var(--bs-success);
    border-color: var(--bs-success-border-subtle);
    background-color: var(--bs-success-bg-subtle);
  }
  &.level--warning {
    color: var(--bs-warning-text-emphasis);
    border-color: var(--bs-warning-border-subtle);
    background-color: var(--bs-warning-bg-subtle);
  }
  &.level--error {
    color: var(--bs-danger);
    border-color: var(--bs-danger-border-subtle);
    background-color: var(--bs-danger-bg-subtle);
  }
  &.level--info {
    color: var(--bs-primary);
    border-color: var(--bs-primary-border-subtle);
    background-color: var(--bs-primary-bg-subtle);
  }
}

.notif-item.is-page .notif-item__icon {
  width: 40px;
  height: 40px;
  margin-top: 0.05rem;
}

.notif-item.is-compact .notif-item__icon {
  align-self: center;
}

.notif-item__body-col {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Заголовок слева — дата сразу справа от него (не у края экрана) */
.notif-item__top {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  min-width: 0;
}

.notif-item__title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  line-height: 1.35;
  color: var(--ui-text);
}

.notif-item.is-page .notif-item__title {
  font-size: 0.9375rem;
}

/* HoverTooltip — flex-ребёнок; без shrink время не сжимается и не перекрывается */
.notif-item__top :deep(.hover-tooltip) {
  flex: 0 0 auto;
  max-width: none;
}

.notif-item__date {
  flex: 0 0 auto;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--ui-text-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.notif-item.is-compact .notif-item__date {
  font-size: 0.7rem;
}

.notif-item__text {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--ui-text-muted);
  word-break: break-word;
  white-space: pre-wrap;
  cursor: pointer;

  &.is-clamped {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal;
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.notif-item.is-page .notif-item__text {
  font-size: 0.875rem;
}

/* Модуль слева — действия справа в одной строке с описанием */
.notif-item__bottom {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 32px;
  margin-top: 0.1rem;
}

.notif-item__source {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

.notif-item__source-spacer {
  flex: 1 1 auto;
}

.notif-item__actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.1rem;
  margin-left: auto;
}

.notif-item__action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background-color: var(--ui-surface-2);
    color: var(--ui-text);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 1px;
  }

  &--danger:hover {
    color: var(--bs-danger);
  }
}

@media (width < $ui-bp-sm) {
  .notif-item__top {
    flex-wrap: wrap;
    gap: 0.2rem 0.75rem;
  }

  .notif-item__date {
    order: -1;
    width: 100%;
    text-align: left;
  }
}
</style>
