<script setup>
import { onMounted, computed, defineAsyncComponent } from 'vue'
import { RefreshCw, Eye, AlertTriangle } from 'lucide-vue-next'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import DataTable from '@/components/DataTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SearchInput from '@/components/SearchInput.vue'
import FilterMenu from '@/components/FilterMenu.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import AuditActorCell from '@/core/cms/adp/admin/AuditLogComponents/AuditActorCell.vue'
import {
  useClientMonitor,
  getClientMonitorColumns,
} from '@/core/client_monitor/composables/useClientMonitor.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const ClientMonitorSessionModal = defineAsyncComponent(() =>
  import('@/core/client_monitor/components/ClientMonitorSessionModal.vue'),
)

const {
  isLoading,
  isRefreshing,
  sessions,
  totalSessions,
  pageSize,
  searchQuery,
  currentPage,
  monitorFilters,
  monitorFilterFields,
  monitorFiltersTooltip,
  selectedSession,
  showDetailsModal,
  events,
  intervals,
  eventsLoading,
  eventsPage,
  eventsTotal,
  eventsHasNext,
  eventsPageSize,
  getItemKey,
  initialize,
  openSession,
  closeSession,
  handleEventsPageChange,
  copyDebugPack,
  refreshSessions,
  handleSearchQuery,
  handlePageChange,
} = useClientMonitor()

const columns = computed(() => getClientMonitorColumns())

const filtersTooltip = computed(() =>
  monitorFiltersTooltip.value || t('admin.clientMonitor.filters'),
)

onMounted(() => {
  void initialize()
})
</script>

<template>
  <div class="client-monitor-panel">
    <div class="cm-toolbar">
      <SearchInput
        id="client-monitor-search"
        class="cm-search-input"
        :model-value="searchQuery"
        layout="grow"
        :placeholder="t('admin.clientMonitor.searchPlaceholder')"
        :show-icon="true"
        background="primary"
        focus-border="primary"
        @update:model-value="handleSearchQuery"
      />

      <div class="cm-filter-menu-wrap">
        <HoverTooltip :text="filtersTooltip" wrap>
          <FilterMenu
            v-model="monitorFilters"
            class="cm-filter-menu"
            :fields="monitorFilterFields"
            :trigger-label="t('admin.clientMonitor.filters')"
            apply-on-change
          />
        </HoverTooltip>
      </div>

      <div class="cm-toolbar__actions">
        <HoverTooltip :text="t('admin.clientMonitor.refresh')">
          <span class="cm-toolbar-icon-wrap">
            <button
              type="button"
              class="btn cm-toolbar-icon-btn"
              :aria-label="t('admin.clientMonitor.refresh')"
              :disabled="isLoading"
              @click="refreshSessions"
            >
              <RefreshCw
                :size="20"
                class="cm-refresh-icon"
                :class="{ 'cm-refresh-icon--spinning': isRefreshing }"
                aria-hidden="true"
              />
            </button>
          </span>
        </HoverTooltip>
      </div>
    </div>

    <LoadingContentArea :loading="isLoading">
      <DataTable
        :columns="columns"
        :items="sessions"
        :total-items="totalSessions"
        :enable-pagination="true"
        :current-page="currentPage"
        :items-per-page="pageSize"
        :get-item-key="getItemKey"
        :clickable="true"
        table-class="cm-data-table"
        :empty-text="t('admin.clientMonitor.empty')"
        @update:current-page="handlePageChange"
        @row-click="openSession"
      >
        <template #cell-last_event_at="{ item }">
          <span class="cm-time">{{ formatDateTime(item.last_event_at) }}</span>
        </template>
        <template #cell-user_label="{ item }">
          <AuditActorCell
            :actor-label="item.user_label"
            :actor-ref="item.user_public_id"
          />
        </template>
        <template #cell-has_errors="{ item }">
          <span v-if="item.has_errors" class="cm-badge cm-badge--error">
            <AlertTriangle :size="14" aria-hidden="true" />
            {{ t('admin.clientMonitor.withErrors') }}
          </span>
          <span v-else class="text-muted">—</span>
        </template>
        <template #cell-actions="{ item }">
          <div class="actions-cell">
            <button
              type="button"
              class="btn-action"
              :title="t('admin.clientMonitor.detailsShort')"
              :aria-label="t('admin.clientMonitor.detailsShort')"
              @click.stop="openSession(item)"
            >
              <Eye :size="15" />
            </button>
          </div>
        </template>
      </DataTable>
    </LoadingContentArea>

    <ClientMonitorSessionModal
      v-if="showDetailsModal"
      :visible="showDetailsModal"
      :session="selectedSession"
      :events="events"
      :intervals="intervals"
      :events-loading="eventsLoading"
      :events-page="eventsPage"
      :events-total="eventsTotal"
      :events-has-next="eventsHasNext"
      :events-page-size="eventsPageSize"
      @close="closeSession"
      @copy-debug-pack="copyDebugPack"
      @update:events-page="handleEventsPageChange"
    />
  </div>
</template>

<style scoped lang="scss">
.client-monitor-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.cm-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  width: 100%;
  margin-bottom: 1rem;
  overflow: visible;

  @media (width < $ui-bp-md) {
    flex-wrap: wrap;
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

.cm-filter-menu-wrap {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;

  :deep(.filter-menu) {
    width: 100%;
    min-width: 0;
  }

  :deep(.hover-tooltip) {
    display: contents;
  }

  @media (width < $ui-bp-md) {
    flex: 1 1 auto;
  }
}

.cm-filter-menu {
  width: auto;
  min-width: 0;

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

.cm-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  flex-shrink: 0;
  margin-left: auto;
  position: relative;
  z-index: 1;

  :deep(.hover-tooltip) {
    flex: 0 0 auto;
  }

  @media (width < $ui-bp-md) {
    margin-left: 0;
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

.cm-time {
  white-space: nowrap;
  color: var(--color-secondary-text);
  font-size: 0.8125rem;
}

.cm-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.cm-badge--error {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  background: color-mix(in srgb, var(--bs-danger, #dc3545) 12%, transparent);
  color: var(--bs-danger, #dc3545);
}

.actions-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-secondary-text);

  &:hover:not(:disabled) {
    background-color: var(--color-hover-background);
    color: var(--color-primary-text);
  }
}

:deep(.cm-data-table) {
  tr.table-row-click {
    cursor: pointer;
  }

  tr.table-row-click:hover {
    background-color: var(--color-hover-background);
  }
}
</style>
