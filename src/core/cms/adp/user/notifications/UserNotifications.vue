<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, BellOff, Check, CheckCheck, ExternalLink, RefreshCw } from 'lucide-vue-next'
import { moduleManager } from '@/modules/index.js'
import { useNotificationsInbox } from '@/core/notifications/js/useNotificationsInbox.js'
import { resolveNotificationIconName } from '@/core/notifications/js/icon-resolver.js'
import NotificationActions from '@/core/notifications/components/NotificationActions.vue'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import SelectBox from '@/components/SelectBox.vue'
import { mapStringOptions } from '@/core/cms/js/adminSelectOptions.js'

const router = useRouter()
const route = useRoute()

const HIGHLIGHT_DURATION_MS = 4000
const highlightedId = ref(null)

const {
  items,
  unreadCount,
  loading,
  hasUnread,
  ensureInitialized,
  loadInitial,
  markRead,
  markAllRead,
} = useNotificationsInbox()

const showOnlyUnread = ref(false)
const sourceFilter = ref(null)

const sourceSelectOptions = computed(() => mapStringOptions(availableSources.value))

const availableSources = computed(() => {
  const set = new Set()
  for (const item of items.value) {
    if (item.source_module) set.add(item.source_module)
  }
  return Array.from(set).sort()
})

const filteredItems = computed(() => {
  return items.value.filter((item) => {
    if (showOnlyUnread.value && item.is_read) return false
    if (sourceFilter.value && item.source_module !== sourceFilter.value) return false
    return true
  })
})

const totalCount = computed(() => items.value.length)

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

function formatNotificationDate(value) {
  if (!value) return ''
  const formatted = formatDateTime(value)
  return formatted === '—' ? '' : formatted
}

function hasTarget(item) {
  if (item?.actions_state === 'pending' && Array.isArray(item?.actions) && item.actions.length) {
    return false
  }
  return Boolean(item?.route?.name) || Boolean(item?.link_url)
}

async function activate(item) {
  await markRead(item.id)
  if (item.route?.name) {
    router.push({ name: item.route.name, params: item.route.params || {} })
    return
  }
  if (item.link_url) {
    if (/^https?:\/\//i.test(item.link_url)) {
      window.open(item.link_url, '_blank', 'noopener')
    } else {
      router.push(item.link_url)
    }
  }
}

function refresh() {
  loadInitial()
}

async function handleOpenQueryParam() {
  const openId = Number(route.query.open)
  if (!openId) return

  // Убираем параметр сразу, чтобы поведение не повторялось при обновлении
  const { open: _open, ...restQuery } = route.query
  router.replace({ query: restQuery })

  const target = items.value.find((n) => n.id === openId)
  if (!target) return

  highlightedId.value = openId
  await markRead(openId)

  await nextTick()
  document
    .querySelector(`[data-notification-id="${openId}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  setTimeout(() => {
    if (highlightedId.value === openId) highlightedId.value = null
  }, HIGHLIGHT_DURATION_MS)
}

onMounted(async () => {
  // ensureInitialized сам вызывает loadInitial при первом запуске;
  // ждём его, иначе повторный loadInitial вернётся мгновенно из-за guard по loading
  await ensureInitialized()
  await loadInitial()
  await handleOpenQueryParam()
})
</script>

<template>
  <div class="card h-100">
    <div class="card-header d-flex flex-wrap gap-2 justify-content-between align-items-center">
      <h5 class="card-title mb-0 d-flex align-items-center">
        <Bell :size="20" class="me-2" />
        <span>Уведомления</span>
        <span v-if="totalCount" class="badge bg-secondary ms-2">{{ totalCount }}</span>
        <span v-if="hasUnread" class="badge bg-primary ms-2">{{ unreadCount }} непрочитанных</span>
      </h5>
      <div class="d-flex gap-2 flex-wrap align-items-center">
        <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="refresh" title="Обновить">
          <RefreshCw :size="16" :class="{ 'spin': loading }" />
        </button>
        <button v-if="hasUnread" type="button" class="btn btn-outline-primary btn-sm" @click="markAllRead">
          <CheckCheck :size="16" class="me-1" />
          Прочитать все
        </button>
      </div>
    </div>

    <div class="card-body">
      <div class="filters d-flex flex-wrap gap-3 align-items-center mb-3">
        <div class="btn-group btn-group-sm" role="group" aria-label="Фильтр по статусу">
          <button type="button" class="btn" :class="showOnlyUnread ? 'btn-outline-primary' : 'btn-primary'" @click="showOnlyUnread = false">
            Все
          </button>
          <button type="button" class="btn" :class="showOnlyUnread ? 'btn-primary' : 'btn-outline-primary'" @click="showOnlyUnread = true">
            Непрочитанные
          </button>
        </div>

        <div v-if="availableSources.length" class="d-flex align-items-center gap-2 filters__source">
          <SelectBox
            v-model="sourceFilter"
            label="Модуль:"
            :options="sourceSelectOptions"
            value-key="id"
            label-key="name"
            all-label="Все"
            fixed-trigger-label-font-size
            :full-width="false"
          />
        </div>
      </div>

      <div v-if="loading && items.length === 0" class="text-center py-5 text-muted">
        Загрузка...
      </div>
      <div v-else-if="items.length === 0" class="empty-state text-center py-5 text-muted">
        <BellOff :size="40" class="mb-2 opacity-50" />
        <p class="mb-0">Пока нет уведомлений</p>
      </div>
      <div v-else-if="filteredItems.length === 0" class="empty-state text-center py-5 text-muted">
        <BellOff :size="40" class="mb-2 opacity-50" />
        <p class="mb-0">Под выбранные фильтры ничего не подходит</p>
      </div>

      <ul v-else class="notifications-list">
        <li v-for="item in filteredItems" :key="item.id" :data-notification-id="item.id" class="notifications-item" :class="[levelClass(item.level), { 'is-unread': !item.is_read, 'is-clickable': hasTarget(item), 'is-highlighted': item.id === highlightedId }]" @click="hasTarget(item) && activate(item)">
          <div class="notifications-item__icon" :class="levelClass(item.level)">
            <component :is="iconFor(item)" :size="20" />
          </div>
          <div class="notifications-item__content">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div class="notifications-item__title">{{ item.title }}</div>
              <span class="notifications-item__date text-muted">{{ formatNotificationDate(item.created_at) }}</span>
            </div>
            <div v-if="item.body" class="notifications-item__body">{{ item.body }}</div>
            <NotificationActions :notification="item" />
            <div class="notifications-item__meta">
              <span v-if="item.source_module" class="notifications-item__source">{{ item.source_module }}</span>
              <span v-if="item.event_key" class="notifications-item__event">{{ item.event_key }}</span>
            </div>
          </div>
          <div class="notifications-item__actions" @click.stop>
            <button v-if="hasTarget(item)" type="button" class="btn btn-sm btn-outline-primary" @click="activate(item)" title="Перейти">
              <ExternalLink :size="14" />
            </button>
            <button v-if="!item.is_read" type="button" class="btn btn-sm btn-outline-secondary" @click="markRead(item.id)" title="Отметить прочитанным">
              <Check :size="14" />
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card {
  border: 1px solid var(--color-border, #dee2e6);
  background-color: var(--color-primary-background);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.filters__source {
  min-width: 180px;

  :deep(.select-box) {
    --select-box-font-size: 0.875rem;
  }
}

.notifications-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notifications-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--color-border, #dee2e6);
  border-radius: 8px;
  background-color: var(--color-primary-background);
  transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  position: relative;

  &.is-clickable {
    cursor: pointer;

    &:hover {
      background-color: var(--color-hover-background);
      border-color: var(--bs-primary-border-subtle, rgba(13, 110, 253, 0.25));
    }
  }

  &.is-unread {
    background-color: var(--color-secondary-background, #f8f9fa);
    border-color: var(--bs-primary-border-subtle, rgba(13, 110, 253, 0.25));

    .notifications-item__title { font-weight: 600; }
  }

  &.level--success { border-left: 3px solid var(--bs-success, #198754); }
  &.level--warning { border-left: 3px solid var(--bs-warning, #ffc107); }
  &.level--error   { border-left: 3px solid var(--bs-danger, #dc3545); }
  &.level--info    { border-left: 3px solid var(--bs-info, #0dcaf0); }

  &.is-highlighted {
    border-color: var(--bs-primary, #0d6efd);
    box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25);
    animation: highlight-fade 4s ease forwards;
  }
}

@keyframes highlight-fade {
  0%, 60% {
    box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.25);
  }
  100% {
    box-shadow: 0 0 0 3px rgba(13, 110, 253, 0);
  }
}

.notifications-item__icon {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
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
  font-size: 0.95rem;
  color: var(--color-primary-text);
  line-height: 1.3;
  word-break: break-word;
}

.notifications-item__date {
  font-size: 0.75rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.notifications-item__body {
  font-size: 0.875rem;
  color: var(--color-secondary-text, #6c757d);
  margin-top: 0.25rem;
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;
}

.notifications-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: var(--color-secondary-text, #6c757d);
}

.notifications-item__source {
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: var(--color-secondary-background, #f1f3f5);
}

.notifications-item__event {
  font-family: var(--bs-font-monospace, monospace);
}

.notifications-item__actions {
  flex: 0 0 auto;
  display: flex;
  gap: 0.25rem;
  align-items: flex-start;
}

@media (max-width: 575px) {
  .notifications-item {
    flex-wrap: wrap;
  }

  .notifications-item__actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
