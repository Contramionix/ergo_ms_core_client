<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRouteQueryState } from '@/composables/useRouteQueryState.js'
import { Archive, ArchiveRestore, Bell, BellOff, CheckCheck, FilterX, Loader2, RefreshCw, Settings, } from 'lucide-vue-next'
import { useNotificationsInbox } from '@/core/notifications/js/useNotificationsInbox.js'
import { groupNotificationsByDate } from '@/core/notifications/js/groupByDate.js'
import NotificationItem from '@/core/notifications/components/NotificationItem.vue'
import SearchInput from '@/components/SearchInput.vue'
import SelectBox from '@/components/SelectBox.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import Pagination from '@/components/Pagination.vue'
import { showUndoableSuccess, useToast } from '@/js/utils/toast.js'
import { clientEnv } from '@/js/clientEnv.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { t } = useAppI18n()

const HIGHLIGHT_DURATION_MS = 4000
const ARCHIVE_UNDO_GROUP = 'notifications.inbox.archive'
const highlightedId = ref(null)
const filtersReady = ref(false)
const groupBusyKey = ref(null)

const {
  items,
  unreadCount,
  loading,
  listTotal,
  listPageSize,
  sourceModules,
  hasUnread,
  ensureInitialized,
  loadPage,
  markRead,
  markAllRead,
  archive,
  unarchive,
} = useNotificationsInbox()

const { state: filterState, patchState, resetState } = useRouteQueryState({
  unread: { default: '', enum: ['', '1'] },
  source: { default: '' },
  archived: { default: '', enum: ['', '1'] },
  q: { default: '' },
  page: { default: 1, type: 'number', min: 1 },
}, { debounceKeys: ['q'] })

const searchDraft = ref('')

watch(
  () => filterState.value.q,
  (q) => {
    if (searchDraft.value !== q) searchDraft.value = q
  },
  { immediate: true },
)

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

const searchQuery = computed({
  get: () => searchDraft.value,
  set: (value) => {
    const next = String(value ?? '')
    searchDraft.value = next
    patchState({ q: next.trim() })
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

const currentPage = computed({
  get: () => filterState.value.page,
  set: (value) => {
    const page = Math.max(1, Number(value) || 1)
    patchState({ page }, { immediate: true })
  },
})

const totalPages = computed(() => {
  const size = listPageSize || 30
  const total = Number(listTotal.value) || 0
  return Math.max(1, Math.ceil(total / size))
})

const headerBadge = computed(() => {
  if (hasUnread.value) return { text: String(unreadCount.value), tone: 'primary' }
  if (listTotal.value) return { text: String(listTotal.value), tone: 'muted' }
  return null
})

const hasActiveFilters = computed(() => {
  const s = filterState.value
  return Boolean(s.unread || s.source || s.archived || String(s.q || '').trim())
})

const emptyTitle = computed(() => {
  if (filterState.value.q?.trim()) return t('settings.inbox.nothingFound')
  if (showArchived.value) return t('settings.inbox.archiveEmpty')
  if (showOnlyUnread.value) return t('settings.inbox.noUnread')
  if (sourceFilter.value) return t('settings.inbox.nothingFound')
  return t('settings.inbox.empty')
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
  return loadPage(filterState.value.page, {
    is_read: showOnlyUnread.value ? false : null,
    source_module: sourceFilter.value || '',
    archived: showArchived.value,
    q: filterState.value.q || '',
  })
}

watch(
  () => [
    filterState.value.unread,
    filterState.value.source,
    filterState.value.archived,
    filterState.value.q,
    filterState.value.page,
  ],
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

function openNotificationSettings() {
  window.dispatchEvent(new CustomEvent('ergo:open-user-settings', {
    detail: { tab: 'notifications' },
  }))
}

function refresh() {
  reloadFromFilters()
}

function resetFilters() {
  searchDraft.value = ''
  return resetState()
}

async function undoArchiveIds(ids) {
  let failed = 0
  for (const id of ids) {
    if (!(await unarchive(id))) failed += 1
  }
  if (failed > 0) {
    toast.error(t('settings.inbox.undoArchiveFailed'))
    throw new Error('notifications.unarchive_undo_failed')
  }
}

async function handleArchive(id) {
  const ok = await archive(id)
  if (!ok) {
    toast.error(t('settings.inbox.actionFailed'))
    return
  }
  showUndoableSuccess(t('settings.inbox.archived'), {
    group: ARCHIVE_UNDO_GROUP,
    kind: 'notifications.archived',
    stackMax: clientEnv.toastUndoStackMax,
    undoAudit: {
      kind: 'notifications.archived',
      label: t('settings.inbox.undoArchiveKind'),
      entityType: 'notification',
      sourceModule: 'core.notifications',
    },
    onUndo: async () => {
      await undoArchiveIds([id])
    },
  })
}

async function runGroupAction(group, action) {
  if (!group?.key || groupBusyKey.value) return

  const snapshot = [...(group.items || [])]
  if (!snapshot.length) return

  groupBusyKey.value = group.key
  let success = 0
  const archivedIds = []

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
        if (await archive(item.id)) {
          archivedIds.push(item.id)
          success += 1
        }
      }
    } else if (action === 'unarchive') {
      for (const item of snapshot) {
        if (await unarchive(item.id)) success += 1
      }
    }
  } finally {
    groupBusyKey.value = null
  }

  const labels = {
    read: t('settings.inbox.read'),
    archive: t('settings.inbox.archived'),
    unarchive: t('settings.inbox.unarchived'),
  }
  const label = labels[action] || t('settings.inbox.done')
  if (success <= 0) {
    toast.error(t('settings.inbox.actionFailed'))
    return
  }

  if (action === 'archive' && archivedIds.length) {
    showUndoableSuccess(`${label}: ${success}`, {
      group: ARCHIVE_UNDO_GROUP,
      kind: 'notifications.archived.group',
      stackMax: clientEnv.toastUndoStackMax,
      undoAudit: {
        kind: 'notifications.archived.group',
        label: t('settings.inbox.undoArchiveKind'),
        entityType: 'notification',
        sourceModule: 'core.notifications',
      },
      onUndo: async () => {
        await undoArchiveIds(archivedIds)
      },
    })
    return
  }

  toast.success(`${label}: ${success}`)
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
        <span>{{ t('settings.inbox.title') }}</span>
        <span v-if="headerBadge" class="notif-page__badge" :class="headerBadge.tone === 'primary' ? 'notif-page__badge--primary' : 'notif-page__badge--muted'">
          {{ headerBadge.text }}
        </span>
      </h1>
      <div class="notif-page__header-actions">
        <HoverTooltip :text="t('settings.inbox.settings')">
          <button
            type="button"
            class="notif-page__icon-btn"
            :aria-label="t('settings.inbox.settings')"
            @click="openNotificationSettings"
          >
            <Settings :size="16" aria-hidden="true" />
          </button>
        </HoverTooltip>
        <HoverTooltip :text="t('settings.inbox.refresh')">
          <button type="button" class="notif-page__icon-btn" :disabled="loading" :aria-label="t('settings.inbox.refresh')" @click="refresh">
            <RefreshCw :size="16" :class="{ spin: loading }" aria-hidden="true" />
          </button>
        </HoverTooltip>
        <button v-if="hasUnread && !showArchived" type="button" class="btn btn-outline-primary btn-sm notif-page__mark-all" @click="handleMarkAllRead">
          <CheckCheck :size="16" aria-hidden="true" />
          {{ sourceFilter ? t('settings.inbox.readByFilter') : t('settings.inbox.readAll') }}
        </button>
      </div>
    </div>

    <div class="card-body notif-page__body">
      <div class="notif-page__filters" role="toolbar" :aria-label="t('settings.inbox.filtersAria')">
        <div class="notif-page__seg" role="group" :aria-label="t('settings.inbox.statusAria')">
          <button type="button" class="notif-page__seg-btn" :class="{ 'is-active': !showOnlyUnread }" :aria-pressed="!showOnlyUnread" @click="showOnlyUnread = false">
            {{ t('settings.inbox.all') }}
          </button>
          <button type="button" class="notif-page__seg-btn" :class="{ 'is-active': showOnlyUnread }" :aria-pressed="showOnlyUnread" @click="showOnlyUnread = true">
            {{ t('settings.inbox.unreadOnly') }}
            <span v-if="hasUnread" class="notif-page__seg-count" aria-hidden="true">{{ unreadCount }}</span>
          </button>
        </div>

        <div class="notif-page__seg" role="group" :aria-label="t('settings.inbox.scopeAria')">
          <button type="button" class="notif-page__seg-btn" :class="{ 'is-active': !showArchived }" :aria-pressed="!showArchived" @click="showArchived = false">
            {{ t('settings.inbox.active') }}
          </button>
          <button type="button" class="notif-page__seg-btn" :class="{ 'is-active': showArchived }" :aria-pressed="showArchived" @click="showArchived = true">
            {{ t('settings.inbox.archive') }}
          </button>
        </div>

        <SearchInput v-model="searchQuery" :placeholder="t('settings.inbox.searchPlaceholder')" :show-icon="true" layout="grow" background="secondary" focus-border="primary"/>

        <div v-if="sourceSelectOptions.length" class="notif-page__source">
          <SelectBox v-model="sourceFilter" :aria-label="t('settings.inbox.moduleAria')" :options="sourceSelectOptions" value-key="id" label-key="name" :all-label="t('settings.inbox.allSources')" :full-width="false"/>
        </div>

        <HoverTooltip v-if="hasActiveFilters" :text="t('settings.inbox.resetFilters')">
          <button type="button" class="notif-page__icon-btn" :aria-label="t('settings.inbox.resetFilters')" @click="resetFilters">
            <FilterX :size="16" aria-hidden="true" />
          </button>
        </HoverTooltip>
      </div>

      <LoadingContentArea :loading="loading" min-height="10rem">
        <div v-if="items.length === 0" class="notif-page__empty text-muted">
          <BellOff :size="40" class="opacity-50" aria-hidden="true" />
          <p>{{ emptyTitle }}</p>
          <button v-if="hasActiveFilters" type="button" class="btn btn-outline-secondary btn-sm notif-page__reset-empty" @click="resetFilters">
            <FilterX :size="14" aria-hidden="true" />
            {{ t('settings.inbox.resetFilters') }}
          </button>
        </div>

        <template v-else>
          <section v-for="group in groupedItems" :key="group.key" class="notif-page__group" :aria-label="group.label">
            <div class="notif-page__group-head">
              <h2 class="notif-page__group-label">
                {{ group.label }}
                <span class="notif-page__group-count">({{ group.items.length }})</span>
              </h2>

              <div class="notif-page__group-actions" role="group" :aria-label="t('settings.inbox.groupActionsAria', { label: group.label })">
                <Loader2 v-if="groupBusyKey === group.key" :size="14" class="notif-page__group-spinner spin" aria-hidden="true"/>

                <HoverTooltip v-if="!showArchived && groupHasUnread(group)" :text="t('settings.inbox.readGroup')">
                  <button type="button" class="notif-page__icon-btn" :disabled="groupBusyKey === group.key" :aria-label="t('settings.inbox.readGroupAria', { label: group.label })" @click="runGroupAction(group, 'read')">
                    <CheckCheck :size="14" aria-hidden="true" />
                  </button>
                </HoverTooltip>

                <HoverTooltip v-if="showArchived" :text="t('settings.inbox.unarchiveGroup')">
                  <button type="button" class="notif-page__icon-btn" :disabled="groupBusyKey === group.key" :aria-label="t('settings.inbox.unarchiveGroupAria', { label: group.label })" @click="runGroupAction(group, 'unarchive')">
                    <ArchiveRestore :size="14" aria-hidden="true" />
                  </button>
                </HoverTooltip>
                <HoverTooltip v-else :text="t('settings.inbox.archiveGroup')">
                  <button type="button" class="notif-page__icon-btn" :disabled="groupBusyKey === group.key" :aria-label="t('settings.inbox.archiveGroupAria', { label: group.label })" @click="runGroupAction(group, 'archive')">
                    <Archive :size="14" aria-hidden="true" />
                  </button>
                </HoverTooltip>
              </div>
            </div>

            <ul class="notif-page__list">
              <NotificationItem v-for="item in group.items" :key="item.id" :notification="item" :highlighted="item.id === highlightedId" :archived-view="showArchived" :date-style="groupDateStyle(group.key)" @mark-read="markRead" @archive="handleArchive" @unarchive="unarchive"/>
            </ul>
          </section>

          <Pagination v-if="listTotal > 0" v-model="currentPage" class="notif-page__pagination" :total-pages="totalPages" :total-items="listTotal" :page-size="listPageSize" :disabled="loading" variant="full" layout="toolbar"/>
        </template>
      </LoadingContentArea>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notif-page {
  border: 1px solid var(--color-border);
  background-color: var(--bs-card-bg);
  color: var(--color-primary-text);
}

.notif-page__header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: center;
  background-color: var(--bs-card-bg);
  border-bottom: 1px solid var(--color-border);
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
  color: var(--color-primary-text);
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
    color: var(--bs-primary-text-emphasis, var(--color-primary-text));
    background-color: var(--bs-primary-bg-subtle, var(--color-secondary-background));
    border: 1px solid var(--bs-primary-border-subtle, var(--color-border));
  }

  &--muted {
    color: var(--color-secondary-text);
    background-color: var(--color-secondary-background);
    border: 1px solid var(--color-border);
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
  gap: 0.5rem 0.625rem;
  align-items: center;
  margin: 0 0 1rem;
  padding: 0 0 0.85rem;
  border-bottom: 1px solid var(--color-border);

  :deep(.search-input) {
    --search-input-height: 2.15rem;
    --search-input-font-size: 0.8125rem;
    min-width: 12rem;
  }
}

.notif-page__seg {
  display: inline-flex;
  align-items: stretch;
  flex: 0 0 auto;
  padding: 0.2rem;
  gap: 0.15rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-secondary-background);
}

.notif-page__seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 1.75rem;
  padding: 0.25rem 0.7rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-secondary-text);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover:not(.is-active) {
    color: var(--color-primary-text);
    background: var(--color-hover-background);
  }

  &.is-active {
    background: var(--bs-card-bg);
    color: var(--color-primary-text);
    box-shadow: 0 0 0 1px var(--color-border);
    font-weight: 600;
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 1px;
  }
}

.notif-page__seg-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--bs-primary-text-emphasis, var(--color-primary-text));
  background: var(--bs-primary-bg-subtle, var(--bs-card-bg));
  border: 1px solid var(--bs-primary-border-subtle, var(--color-border));
}

.notif-page__source {
  flex: 0 0 auto;
  min-width: 160px;
  display: flex;
  align-items: center;

  :deep(.select-box) {
    --select-box-font-size: 0.8125rem;
    --select-box-trigger-min-height: 2.15rem;
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
  color: var(--color-secondary-text);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover:not(:disabled) {
    background-color: var(--color-secondary-background);
    color: var(--color-primary-text);
    border-color: var(--color-border);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent, var(--bs-primary));
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.notif-page__empty {
  text-align: center;
  padding: 3rem 1rem;

  p {
    margin: 0.75rem 0 0;
  }
}

.notif-page__reset-empty {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1rem;
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
  font-size: 0.875rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-secondary-text);
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
  color: var(--color-secondary-text);
  margin-right: 0.15rem;
}

.notif-page__list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--bs-card-bg);

  :deep(.notif-item) {
    border-radius: 0;
    border-bottom: 1px solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }
  }
}

.notif-page__pagination {
  margin-top: 1rem;
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

  .notif-page__icon-btn,
  .notif-page__seg-btn {
    transition: none;
  }
}

@media (width < $ui-bp-sm) {
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