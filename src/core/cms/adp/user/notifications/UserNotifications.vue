<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-vue-next'
import { useNotificationsInbox } from '@/core/notifications/js/useNotificationsInbox.js'
import { groupNotificationsByDate } from '@/core/notifications/js/groupByDate.js'
import NotificationItem from '@/core/notifications/components/NotificationItem.vue'
import SelectBox from '@/components/SelectBox.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import { confirmDelete } from '@/js/utils/confirm.js'
import { useToast } from '@/js/utils/toast.js'

const router = useRouter()
const route = useRoute()
const toast = useToast()

const HIGHLIGHT_DURATION_MS = 4000
const highlightedId = ref(null)
const filtersReady = ref(false)
const groupBusyKey = ref(null)

const {
  items,
  unreadCount,
  loading,
  loadingMore,
  hasMore,
  listTotal,
  sourceModules,
  hasUnread,
  ensureInitialized,
  loadInitial,
  loadMore,
  markRead,
  markAllRead,
  archive,
  unarchive,
  softDelete,
} = useNotificationsInbox()

const { state: filterState, patchState } = useRouteQueryState({
  unread: { default: '', enum: ['', '1'] },
  source: { default: '' },
  archived: { default: '', enum: ['', '1'] },
})

const showOnlyUnread = computed({
  get: () => filterState.value.unread === '1',
  set: (value) => {
    patchState({ unread: value ? '1' : '' }, { immediate: true })
  },
})

const showArchived = computed({
  get: () => filterState.value.archived === '1',
  set: (value) => {
    patchState({ archived: value ? '1' : '' }, { immediate: true })
  },
})

const sourceFilter = computed({
  get: () => filterState.value.source || null,
  set: (value) => {
    patchState({ source: value || '' }, { immediate: true })
  },
})

const sourceSelectOptions = computed(() => {
  return (sourceModules.value || [])
    .map((item) => {
      if (item && typeof item === 'object') {
        const id = item.id || item.module || ''
        if (!id) return null
        return { id, name: item.name || item.module_label || id }
      }
      if (typeof item === 'string' && item) {
        return { id: item, name: item }
      }
      return null
    })
    .filter(Boolean)
})

const groupedItems = computed(() => groupNotificationsByDate(items.value))

const headerBadge = computed(() => {
  if (hasUnread.value) return { text: String(unreadCount.value), tone: 'primary' }
  if (listTotal.value) return { text: String(listTotal.value), tone: 'muted' }
  return null
})

const emptyTitle = computed(() => {
  if (showArchived.value) return 'Архив пуст'
  if (showOnlyUnread.value) return 'Нет непрочитанных'
  if (sourceFilter.value) return 'Ничего не найдено'
  return 'Пока нет уведомлений'
})

function groupHasUnread(group) {
  return (group.items || []).some((n) => !n.is_read)
}

function groupDateStyle(groupKey) {
  if (groupKey === 'today' || groupKey === 'yesterday') return 'time'
  if (groupKey === 'week') return 'weekday'
  return 'full'
}

function reloadFromFilters() {
  return loadInitial({
    is_read: showOnlyUnread.value ? false : null,
    source_module: sourceFilter.value || '',
    archived: showArchived.value,
  })
}

watch(
  () => [filterState.value.unread, filterState.value.source, filterState.value.archived],
  () => {
    if (!filtersReady.value) return
    reloadFromFilters()
  },
)

async function handleMarkAllRead() {
  if (sourceFilter.value) {
    await markAllRead({ source_module: sourceFilter.value })
  } else {
    await markAllRead()
  }
}

function refresh() {
  reloadFromFilters()
}

async function runGroupAction(group, action) {
  if (!group?.key || groupBusyKey.value) return

  const snapshot = [...(group.items || [])]
  if (!snapshot.length) return

  if (action === 'delete') {
    const ok = await confirmDelete(
      'Удаление уведомлений',
      `Удалить ${snapshot.length} уведомлений из группы «${group.label}»?`,
    )
    if (!ok) return
  }

  groupBusyKey.value = group.key
  let success = 0

  try {
    if (action === 'read') {
      const unread = snapshot.filter((n) => !n.is_read)
      for (const item of unread) {
        await markRead(item.id)
        const current = items.value.find((n) => n.id === item.id)
        if (!current || current.is_read) success += 1
      }
    } else if (action === 'archive') {
      for (const item of snapshot) {
        if (await archive(item.id)) success += 1
      }
    } else if (action === 'unarchive') {
      for (const item of snapshot) {
        if (await unarchive(item.id)) success += 1
      }
    } else if (action === 'delete') {
      for (const item of snapshot) {
        if (await softDelete(item.id)) success += 1
      }
    }
  } finally {
    groupBusyKey.value = null
  }

  const labels = {
    read: 'Прочитано',
    archive: 'В архиве',
    unarchive: 'Возвращено из архива',
    delete: 'Удалено',
  }
  const label = labels[action] || 'Готово'
  if (success > 0) {
    toast.success(`${label}: ${success}`)
  } else {
    toast.error('Не удалось выполнить действие')
  }
}

async function handleOpenQueryParam() {
  const openId = Number(route.query.open)
  if (!openId) return

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
  await ensureInitialized({ skipLoad: true })
  await reloadFromFilters()
  filtersReady.value = true
  await handleOpenQueryParam()
})
</script>

<template>
  <div class="notif-page card h-100">
    <div class="card-header notif-page__header">
      <h1 class="notif-page__title">
        <Bell :size="20" aria-hidden="true" />
        <span>Уведомления</span>
        <span
          v-if="headerBadge"
          class="notif-page__badge"
          :class="headerBadge.tone === 'primary' ? 'notif-page__badge--primary' : 'notif-page__badge--muted'"
        >
          {{ headerBadge.text }}
        </span>
      </h1>
      <div class="notif-page__header-actions">
        <HoverTooltip text="Обновить">
          <button
            type="button"
            class="notif-page__icon-btn"
            :disabled="loading"
            aria-label="Обновить"
            @click="refresh"
          >
            <RefreshCw :size="16" :class="{ spin: loading }" aria-hidden="true" />
          </button>
        </HoverTooltip>
        <button
          v-if="hasUnread && !showArchived"
          type="button"
          class="btn btn-outline-primary btn-sm notif-page__mark-all"
          @click="handleMarkAllRead"
        >
          <CheckCheck :size="16" aria-hidden="true" />
          {{ sourceFilter ? 'Прочитать по фильтру' : 'Прочитать все' }}
        </button>
      </div>
    </div>

    <div class="card-body notif-page__body">
      <div class="notif-page__filters" role="toolbar" aria-label="Фильтры уведомлений">
        <div class="btn-group btn-group-sm notif-page__seg" role="group" aria-label="Статус">
          <button
            type="button"
            class="btn"
            :class="showOnlyUnread ? 'btn-outline-primary' : 'btn-primary'"
            @click="showOnlyUnread = false"
          >
            Все
          </button>
          <button
            type="button"
            class="btn"
            :class="showOnlyUnread ? 'btn-primary' : 'btn-outline-primary'"
            @click="showOnlyUnread = true"
          >
            Непрочитанные
          </button>
        </div>

        <div class="btn-group btn-group-sm notif-page__seg" role="group" aria-label="Область">
          <button
            type="button"
            class="btn"
            :class="showArchived ? 'btn-outline-primary' : 'btn-primary'"
            @click="showArchived = false"
          >
            Активные
          </button>
          <button
            type="button"
            class="btn"
            :class="showArchived ? 'btn-primary' : 'btn-outline-primary'"
            @click="showArchived = true"
          >
            Архив
          </button>
        </div>

        <div v-if="sourceSelectOptions.length" class="notif-page__source">
          <SelectBox
            v-model="sourceFilter"
            aria-label="Модуль"
            :options="sourceSelectOptions"
            value-key="id"
            label-key="name"
            all-label="Все"
            :full-width="false"
          />
        </div>
      </div>

      <LoadingContentArea :loading="loading" min-height="10rem">
        <div v-if="items.length === 0" class="notif-page__empty text-muted">
          <BellOff :size="40" class="opacity-50" aria-hidden="true" />
          <p>{{ emptyTitle }}</p>
        </div>

        <template v-else>
          <section
            v-for="group in groupedItems"
            :key="group.key"
            class="notif-page__group"
            :aria-label="group.label"
          >
            <div class="notif-page__group-head">
              <h2 class="notif-page__group-label">
                {{ group.label }}
                <span class="notif-page__group-count">({{ group.items.length }})</span>
              </h2>

              <div
                class="notif-page__group-actions"
                role="group"
                :aria-label="`Действия для группы ${group.label}`"
              >
                <Loader2
                  v-if="groupBusyKey === group.key"
                  :size="14"
                  class="notif-page__group-spinner spin"
                  aria-hidden="true"
                />

                <HoverTooltip
                  v-if="!showArchived && groupHasUnread(group)"
                  text="Прочитать группу"
                >
                  <button
                    type="button"
                    class="notif-page__icon-btn"
                    :disabled="groupBusyKey === group.key"
                    :aria-label="`Прочитать группу ${group.label}`"
                    @click="runGroupAction(group, 'read')"
                  >
                    <CheckCheck :size="14" aria-hidden="true" />
                  </button>
                </HoverTooltip>

                <HoverTooltip
                  v-if="showArchived"
                  text="Вернуть группу из архива"
                >
                  <button
                    type="button"
                    class="notif-page__icon-btn"
                    :disabled="groupBusyKey === group.key"
                    :aria-label="`Вернуть группу ${group.label} из архива`"
                    @click="runGroupAction(group, 'unarchive')"
                  >
                    <ArchiveRestore :size="14" aria-hidden="true" />
                  </button>
                </HoverTooltip>
                <HoverTooltip
                  v-else
                  text="Архивировать группу"
                >
                  <button
                    type="button"
                    class="notif-page__icon-btn"
                    :disabled="groupBusyKey === group.key"
                    :aria-label="`Архивировать группу ${group.label}`"
                    @click="runGroupAction(group, 'archive')"
                  >
                    <Archive :size="14" aria-hidden="true" />
                  </button>
                </HoverTooltip>

                <HoverTooltip text="Удалить группу">
                  <button
                    type="button"
                    class="notif-page__icon-btn notif-page__icon-btn--danger"
                    :disabled="groupBusyKey === group.key"
                    :aria-label="`Удалить группу ${group.label}`"
                    @click="runGroupAction(group, 'delete')"
                  >
                    <Trash2 :size="14" aria-hidden="true" />
                  </button>
                </HoverTooltip>
              </div>
            </div>

            <ul class="notif-page__list">
              <NotificationItem
                v-for="item in group.items"
                :key="item.id"
                v-memo="[item.id, item.is_read, item.archived_at, item.actions_state, item.id === highlightedId, group.key]"
                :notification="item"
                :highlighted="item.id === highlightedId"
                :archived-view="showArchived"
                :date-style="groupDateStyle(group.key)"
                @mark-read="markRead"
                @archive="archive"
                @unarchive="unarchive"
                @delete="softDelete"
              />
            </ul>
          </section>

          <div v-if="hasMore" class="notif-page__more">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :disabled="loadingMore"
              @click="loadMore"
            >
              <span v-if="loadingMore" class="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              Загрузить ещё
            </button>
          </div>
        </template>
      </LoadingContentArea>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notif-page {
  border: 1px solid var(--ui-border);
  background-color: var(--ui-surface);
  color: var(--ui-text);
}

.notif-page__header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: center;
  background-color: var(--ui-surface);
  border-bottom: 1px solid var(--ui-border);
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
}

.notif-page__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ui-text);
}

.notif-page__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 650;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;

  &--primary {
    color: var(--bs-primary-text-emphasis, var(--ui-text));
    background-color: var(--bs-primary-bg-subtle, var(--ui-surface-2));
    border: 1px solid var(--bs-primary-border-subtle, var(--ui-border));
  }

  &--muted {
    color: var(--ui-text-muted);
    background-color: var(--ui-surface-2);
    border: 1px solid var(--ui-border);
  }
}

.notif-page__header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.notif-page__mark-all {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.notif-page__body {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.notif-page__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  align-items: center;
  margin: 0 0 1rem;
  padding: 0 0 0.85rem;
  border-bottom: 1px solid var(--ui-border);
}

.notif-page__seg {
  flex: 0 0 auto;

  .btn {
    min-height: 31px;
    display: inline-flex;
    align-items: center;
  }
}

.notif-page__source {
  min-width: 160px;
  margin-left: auto;
  display: flex;
  align-items: center;

  :deep(.select-box) {
    --select-box-font-size: 0.875rem;
    --select-box-trigger-min-height: 31px;
    --select-box-item-padding-y: 0.25rem;
    --select-box-item-padding-x: 0.5rem;
    width: 100%;
  }

  :deep(.form-label) {
    display: none;
  }
}

.notif-page__icon-btn {
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
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    background-color: var(--ui-surface-2);
    color: var(--ui-text);
    border-color: var(--ui-border);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--danger:hover:not(:disabled) {
    color: var(--bs-danger);
    border-color: var(--bs-danger-border-subtle, var(--ui-border));
  }
}

.notif-page__empty {
  text-align: center;
  padding: 3rem 1rem;

  p {
    margin: 0.75rem 0 0;
  }
}

.notif-page__group {
  margin-bottom: 1.25rem;
}

.notif-page__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0 0 0.4rem;
  padding: 0 0.15rem;
  min-height: 32px;
}

.notif-page__group-label {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ui-text-muted);
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.notif-page__group-count {
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}

.notif-page__group-actions {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex: 0 0 auto;
}

.notif-page__group-spinner {
  color: var(--ui-text-muted);
  margin-right: 0.15rem;
}

.notif-page__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--ui-surface);

  :deep(.notif-item) {
    border-radius: 0;
    border-bottom: 1px solid var(--ui-border);

    &:last-child {
      border-bottom: none;
    }
  }
}

.notif-page__more {
  display: flex;
  justify-content: center;
  padding: 1rem 0 0.25rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }

  .notif-page__icon-btn {
    transition: none;
  }
}

@media (max-width: 575px) {
  .notif-page__source {
    margin-left: 0;
    width: 100%;
    min-width: 0;
  }

  .notif-page__group-head {
    flex-wrap: wrap;
  }
}
</style>
