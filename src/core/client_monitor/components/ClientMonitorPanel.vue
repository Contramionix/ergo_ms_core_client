<script setup>
import { onMounted, computed, ref, watch } from 'vue'
import { RefreshCw, Copy, ArrowLeft, AlertTriangle } from 'lucide-vue-next'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import DataTable from '@/components/DataTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SearchInput from '@/components/SearchInput.vue'
import FilterMenu from '@/components/FilterMenu.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import { useClientMonitor } from '@/core/client_monitor/composables/useClientMonitor.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const {
  isLoading,
  sessions,
  totalSessions,
  currentPage,
  pageSize,
  searchQuery,
  hasErrorsOnly,
  dateFrom,
  dateTo,
  selectedSession,
  events,
  intervals,
  eventsLoading,
  eventsHasNext,
  loadSessions,
  openSession,
  closeSession,
  loadMoreEvents,
  copyDebugPack,
  handleSearchQuery,
  handlePageChange,
  applyFilters,
} = useClientMonitor()

const filterModel = ref({
  hasErrors: '1',
  dateFrom: '',
  dateTo: '',
})

watch(filterModel, (value) => {
  hasErrorsOnly.value = value.hasErrors === '1'
  dateFrom.value = value.dateFrom || ''
  dateTo.value = value.dateTo || ''
}, { deep: true })


const filterFields = computed(() => [
  { type: 'heading', label: t('admin.clientMonitor.filtersHeading') },
  {
    type: 'select',
    key: 'hasErrors',
    label: t('admin.clientMonitor.errorsFilter'),
    options: [
      { id: '', name: t('admin.clientMonitor.allSessions') },
      { id: '1', name: t('admin.clientMonitor.withErrors') },
    ],
    valueKey: 'id',
    labelKey: 'name',
    includeAllOption: false,
  },
  { type: 'heading', label: t('admin.clientMonitor.period') },
  { type: 'date', key: 'dateFrom', label: t('admin.clientMonitor.dateFrom') },
  { type: 'date', key: 'dateTo', label: t('admin.clientMonitor.dateTo') },
])

const columns = computed(() => [
  { key: 'last_event_at', label: t('admin.clientMonitor.lastEvent'), sortable: false },
  { key: 'user_label', label: t('admin.clientMonitor.user'), sortable: false },
  { key: 'has_errors', label: t('admin.clientMonitor.errors'), sortable: false },
  { key: 'event_count', label: t('admin.clientMonitor.events'), sortable: false },
  { key: 'client_version', label: t('admin.clientMonitor.version'), sortable: false },
  { key: 'actions', label: '', sortable: false },
])

function kindClass(kind) {
  return `cm-kind cm-kind--${kind || 'unknown'}`
}

function eventSummary(event) {
  const payload = event.payload || {}
  if (event.kind === 'nav') {
    return payload.path || payload.to || payload.route_name || ''
  }
  if (event.kind === 'api') {
    return [payload.method, payload.path || payload.endpoint, payload.status]
      .filter((part) => part != null && part !== '')
      .join(' ')
  }
  return payload.message || payload.event || ''
}

onMounted(() => {
  void loadSessions()
})
</script>

<template>
  <div class="client-monitor-panel">
    <template v-if="!selectedSession">
      <div class="cm-toolbar">
        <SearchInput
          id="client-monitor-search"
          class="cm-search-input"
          :model-value="searchQuery"
          layout="grow"
          :placeholder="t('admin.clientMonitor.searchPlaceholder')"
          :show-icon="true"
          @update:model-value="handleSearchQuery"
        />
        <FilterMenu
          v-model="filterModel"
          class="cm-filter-menu"
          :fields="filterFields"
          :trigger-label="t('admin.clientMonitor.filters')"
          apply-on-change
          @apply="applyFilters"
        />
        <HoverTooltip :text="t('admin.clientMonitor.refresh')">
          <span class="cm-toolbar-icon-wrap">
            <button
              type="button"
              class="btn cm-toolbar-icon-btn"
              :aria-label="t('admin.clientMonitor.refresh')"
              :disabled="isLoading"
              @click="loadSessions"
            >
              <RefreshCw
                :size="20"
                class="cm-refresh-icon"
                :class="{ 'cm-refresh-icon--spinning': isLoading }"
                aria-hidden="true"
              />
            </button>
          </span>
        </HoverTooltip>
      </div>

      <LoadingContentArea :loading="isLoading">
        <DataTable
          :columns="columns"
          :items="sessions"
          :total-items="totalSessions"
          :enable-pagination="true"
          :current-page="currentPage"
          :items-per-page="pageSize"
          :empty-text="t('admin.clientMonitor.empty')"
          @update:current-page="handlePageChange"
        >
          <template #cell-last_event_at="{ item }">
            {{ formatDateTime(item.last_event_at) }}
          </template>
          <template #cell-user_label="{ item }">
            <div class="cm-user">
              <span>{{ item.user_label || '—' }}</span>
              <small v-if="item.user_public_id" class="text-muted">{{ item.user_public_id }}</small>
            </div>
          </template>
          <template #cell-has_errors="{ item }">
            <span v-if="item.has_errors" class="cm-badge cm-badge--error">
              <AlertTriangle :size="14" />
              {{ t('admin.clientMonitor.withErrors') }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
          <template #cell-actions="{ item }">
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              @click="openSession(item)"
            >
              {{ t('admin.clientMonitor.open') }}
            </button>
          </template>
        </DataTable>
      </LoadingContentArea>
    </template>

    <template v-else>
      <div class="cm-detail-header">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          @click="closeSession"
        >
          <ArrowLeft :size="16" />
          {{ t('admin.clientMonitor.back') }}
        </button>
        <div class="cm-detail-meta">
          <h2 class="cm-detail-title">{{ selectedSession.user_label || selectedSession.user_public_id }}</h2>
          <p class="cm-detail-sub">
            {{ selectedSession.public_id }}
            · {{ selectedSession.client_version || '—' }}
            · {{ selectedSession.viewport || '—' }}
          </p>
          <p class="cm-detail-ua text-muted">{{ selectedSession.user_agent }}</p>
        </div>
        <div class="cm-detail-actions">
          <button
            type="button"
            class="btn btn-primary btn-sm"
            @click="copyDebugPack()"
          >
            <Copy :size="16" />
            {{ t('admin.clientMonitor.copySession') }}
          </button>
        </div>
      </div>

      <div v-if="intervals.length" class="cm-intervals">
        <h3 class="cm-section-title">{{ t('admin.clientMonitor.intervals') }}</h3>
        <div class="cm-interval-list">
          <button
            v-for="interval in intervals"
            :key="interval.index"
            type="button"
            class="cm-interval-card"
            @click="copyDebugPack({ interval_index: interval.index })"
          >
            <span>#{{ interval.index + 1 }}</span>
            <span>{{ interval.event_count }} {{ t('admin.clientMonitor.eventsUnit') }}</span>
            <span v-if="interval.error_count" class="cm-badge cm-badge--error">
              {{ interval.error_count }} {{ t('admin.clientMonitor.errorsUnit') }}
            </span>
            <Copy :size="14" />
          </button>
        </div>
      </div>

      <h3 class="cm-section-title">{{ t('admin.clientMonitor.timeline') }}</h3>
      <LoadingContentArea :loading="eventsLoading && !events.length" min-height="10rem">
        <ul class="cm-timeline">
          <li
            v-for="event in events"
            :key="event.id"
            class="cm-timeline__item"
          >
            <span :class="kindClass(event.kind)">{{ event.kind }}</span>
            <span class="cm-timeline__time">{{ formatDateTime(event.created_at) }}</span>
            <span class="cm-timeline__summary">{{ eventSummary(event) }}</span>
            <button
              v-if="event.kind === 'error'"
              type="button"
              class="btn btn-sm btn-outline-danger"
              @click="copyDebugPack({ around_error_id: event.id })"
            >
              <Copy :size="14" />
              {{ t('admin.clientMonitor.copyAroundError') }}
            </button>
          </li>
        </ul>
        <div v-if="!events.length && !eventsLoading" class="text-muted py-3">
          {{ t('admin.clientMonitor.timelineEmpty') }}
        </div>
        <button
          v-if="eventsHasNext"
          type="button"
          class="btn btn-outline-secondary btn-sm mt-2"
          :disabled="eventsLoading"
          @click="loadMoreEvents"
        >
          {{ t('admin.clientMonitor.loadMore') }}
        </button>
      </LoadingContentArea>
    </template>
  </div>
</template>

<style scoped lang="scss">
.client-monitor-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cm-toolbar {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: center;
  width: 100%;

  :deep(.hover-tooltip) {
    flex: 0 0 auto;
  }
}

.cm-search-input {
  flex: 1 1 0;
  width: auto !important;
  min-width: 0;
  max-width: none;

  --search-input-height: 38px;
  --search-input-font-size: 0.875rem;
}

.cm-filter-menu {
  flex: 0 0 auto;
  --filter-menu-trigger-font-size: 0.875rem;
  --select-box-font-size: 0.875rem;
  --select-box-trigger-min-height: 38px;

  :deep(.filter-menu__trigger) {
    min-height: 38px;
    height: 38px;
    padding-top: 0;
    padding-bottom: 0;
  }
}

.cm-toolbar-icon-wrap {
  display: inline-flex;
}

.cm-toolbar-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background-color: var(--color-primary-background, var(--bs-body-bg));
  color: var(--color-primary-text);
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background-color: var(--color-hover-background);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.cm-refresh-icon {
  flex-shrink: 0;

  &--spinning {
    animation: cm-refresh-spin 0.8s linear infinite;
    @include ui-reduced-motion;
  }
}

@keyframes cm-refresh-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.cm-user {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.cm-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
}

.cm-badge--error {
  color: var(--ui-danger, #dc3545);
}

.cm-detail-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}

.cm-detail-meta {
  flex: 1 1 16rem;
  min-width: 0;
}

.cm-detail-title {
  font-size: 1.15rem;
  margin: 0 0 0.25rem;
}

.cm-detail-sub,
.cm-detail-ua {
  margin: 0;
  font-size: 0.85rem;
  word-break: break-word;
}

.cm-detail-actions {
  display: flex;
  gap: 0.5rem;
}

.cm-section-title {
  font-size: 1rem;
  margin: 0.5rem 0;
}

.cm-interval-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.cm-interval-card {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--ui-border, #dee2e6);
  background: var(--ui-surface, #fff);
  color: var(--ui-text, inherit);
  border-radius: 6px;
  padding: 0.4rem 0.7rem;
  font-size: 0.85rem;
}

.cm-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.cm-timeline__item {
  display: grid;
  grid-template-columns: 5.5rem 9.5rem 1fr auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--ui-border, #eee);
  font-size: 0.85rem;
}

.cm-timeline__summary {
  word-break: break-word;
}

.cm-kind {
  display: inline-block;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.7rem;
}

.cm-kind--error { color: var(--ui-danger, #dc3545); }
.cm-kind--warn { color: var(--ui-warning, #b78103); }
.cm-kind--api { color: var(--ui-primary, #0d6efd); }
.cm-kind--nav { color: var(--ui-text-muted, #6c757d); }
.cm-kind--lifecycle { color: var(--ui-success, #198754); }

@media (max-width: 900px) {
  .cm-timeline__item {
    grid-template-columns: 1fr;
  }
}
</style>
