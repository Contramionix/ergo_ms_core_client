<script setup>
import { onMounted, toRef, watch, computed } from 'vue'
import { Download, RefreshCw, Eye } from 'lucide-vue-next'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import DataTable from '@/components/DataTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SearchInput from '@/components/SearchInput.vue'
import FilterMenu from '@/components/FilterMenu.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import AuditEventDetailsModal from '@/core/cms/adp/admin/AuditLogComponents/AuditEventDetailsModal.vue'
import AuditActorCell from '@/core/cms/adp/admin/AuditLogComponents/AuditActorCell.vue'
import {
  useAuditLog,
  AUDIT_COLUMNS,
} from '@/core/audit/composables/useAuditLog.js'

const props = defineProps({
  scopeParams: {
    type: Object,
    default: null,
  },
  syncRouteQuery: {
    type: Boolean,
    default: true,
  },
  searchInputId: {
    type: String,
    default: 'audit-search',
  },
  embedded: {
    type: Boolean,
    default: false,
  },
})

const scopeParamsRef = toRef(props, 'scopeParams')

const {
  isLoading,
  isRefreshing,
  events,
  totalEvents,
  rowsPerPage,
  searchQuery,
  currentPage,
  auditFilters,
  auditFilterFields,
  selectedEvent,
  showDetailsModal,
  resolveIcon,
  severityMeta,
  hasDetails,
  ipLocationTooltip,
  hasIpLocationTooltip,
  getItemKey,
  initialize,
  openDetails,
  refreshEvents,
  handleSearchQuery,
  handlePageChange,
  closeDetails,
  exportCsv,
} = useAuditLog({
  scopeParams: scopeParamsRef,
  syncRouteQuery: props.syncRouteQuery,
})

onMounted(() => {
  initialize()
})

watch(scopeParamsRef, () => {
  initialize()
}, { deep: true })

const displayColumns = computed(() => (
  props.embedded
    ? AUDIT_COLUMNS.filter((column) => !['ip_address', 'actions'].includes(column.key))
    : AUDIT_COLUMNS
))
</script>

<template>
  <div class="audit-log-panel" :class="{ 'audit-log-panel--embedded': embedded }">
    <div class="audit-toolbar">
      <SearchInput
        :id="searchInputId"
        :model-value="searchQuery"
        layout="grow"
        placeholder="Инициатор или объект..."
        :show-icon="true"
        background="primary"
        focus-border="primary"
        class="audit-search-input"
        @update:model-value="handleSearchQuery"
      />

      <div class="audit-filter-menu-wrap">
        <FilterMenu
          v-model="auditFilters"
          :fields="auditFilterFields"
          trigger-label="Фильтры"
          apply-on-change
          class="audit-filter-menu"
        />
      </div>

      <div class="audit-toolbar__actions">
        <HoverTooltip text="Обновить">
          <span class="audit-toolbar-icon-wrap">
            <button
              type="button"
              class="btn audit-toolbar-icon-btn"
              aria-label="Обновить"
              :disabled="isLoading"
              @click="refreshEvents"
            >
              <RefreshCw
                :size="20"
                class="audit-refresh-icon"
                :class="{ 'audit-refresh-icon--spinning': isRefreshing }"
                aria-hidden="true"
              />
            </button>
          </span>
        </HoverTooltip>
        <HoverTooltip text="Экспорт CSV">
          <span class="audit-toolbar-icon-wrap">
            <button
              type="button"
              class="btn audit-toolbar-icon-btn"
              aria-label="Экспорт CSV"
              @click="exportCsv"
            >
              <Download :size="20" aria-hidden="true" />
            </button>
          </span>
        </HoverTooltip>
      </div>
    </div>

    <LoadingContentArea :loading="isLoading">
      <DataTable
        :items="events"
        :columns="displayColumns"
        :show-number-column="false"
        :items-per-page="rowsPerPage"
        :current-page="currentPage"
        :total-items="totalEvents"
        :get-item-key="getItemKey"
        :enable-pagination="true"
        :clickable="embedded"
        table-class="audit-data-table"
        empty-text="Записи не найдены"
        @update:current-page="handlePageChange"
        @row-click="openDetails"
      >
        <template #cell-created_at="{ item }">
          <span class="audit-time">{{ formatDateTime(item.created_at) }}</span>
        </template>

        <template #cell-action="{ item }">
          <div class="audit-action">
            <component :is="resolveIcon(item.icon)" :size="18" class="audit-action__icon" />
            <div class="audit-action__text">
              <span class="audit-action__label">{{ item.action_label }}</span>
              <small class="audit-action__module">{{ item.module_label }}</small>
            </div>
          </div>
        </template>

        <template #cell-actor_label="{ item }">
          <AuditActorCell
            :actor-label="item.actor_label"
            :actor-ref="item.actor_ref"
            :actor-id="item.actor"
            :actor-first-name="item.actor_first_name"
            :actor-last-name="item.actor_last_name"
            :actor-middle-name="item.actor_middle_name"
          />
        </template>

        <template #cell-entity_label="{ item }">
          <span class="audit-entity-label">{{ item.entity_label || '—' }}</span>
        </template>

        <template #cell-severity="{ item }">
          <span class="audit-severity" :class="severityMeta(item.severity).cls">
            {{ severityMeta(item.severity).label }}
          </span>
        </template>

        <template #cell-ip_address="{ item }">
          <HoverTooltip :text="ipLocationTooltip(item)" wrap>
            <span
              class="text-muted audit-ip"
              :class="{ 'audit-ip--has-location': hasIpLocationTooltip(item) }"
            >
              {{ item.ip_address || '—' }}
            </span>
          </HoverTooltip>
        </template>

        <template #cell-actions="{ item }">
          <div class="actions-cell">
            <button
              v-if="hasDetails(item)"
              type="button"
              class="btn-action"
              title="Подробности"
              aria-label="Подробности"
              @click.stop="openDetails(item)"
            >
              <Eye :size="15" />
            </button>
          </div>
        </template>
      </DataTable>
    </LoadingContentArea>

    <AuditEventDetailsModal
      :visible="showDetailsModal"
      :event="selectedEvent"
      @close="closeDetails"
    />
  </div>
</template>

<style scoped lang="scss">
.audit-log-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.audit-log-panel--embedded {
  gap: 0;
}

.audit-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  width: 100%;
  margin-bottom: 1rem;
  overflow: visible;

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
}

.audit-log-panel--embedded .audit-toolbar {
  margin-bottom: 24px;
}

.audit-search-input {
  flex: 1 1 0;
  width: auto !important;
  min-width: 0;
  max-width: none;

  --search-input-height: 38px;
  --search-input-font-size: 0.875rem;
}

.audit-filter-menu-wrap {
  flex: 0 0 auto;
  width: 132px;
  min-width: 132px;

  /* у .filter-menu в компоненте min-width: 170px — без сброса
     триггер вылезает за обёртку и под кнопку «Обновить» */
  :deep(.filter-menu) {
    width: 100%;
    min-width: 0;
  }
}

.audit-filter-menu {
  width: 132px;

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

.audit-toolbar__actions {
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

  @media (max-width: 768px) {
    margin-left: 0;
  }
}

.audit-toolbar-icon-wrap {
  display: inline-flex;
}

.audit-toolbar-icon-btn {
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

.audit-log-panel--embedded {
  :deep(.audit-data-table) {
    margin-bottom: 0;
    font-size: 0.875rem;
  }

  :deep(.data-table-header th) {
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
  }

  :deep(.data-table-empty-cell) {
    padding: 1.5rem 1rem;
  }

  :deep(tr.table-row-click) {
    cursor: pointer;
  }

  :deep(tr.table-row-click:hover) {
    background-color: var(--color-hover-background);
  }
}

.audit-refresh-icon {
  flex-shrink: 0;

  &--spinning {
    animation: audit-refresh-spin 0.8s linear infinite;
  }
}

@keyframes audit-refresh-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.audit-time {
  white-space: nowrap;
  color: var(--color-secondary-text);
  font-size: 0.8125rem;
}

.audit-entity-label {
  display: inline-block;
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.audit-ip--has-location {
  cursor: help;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}

.audit-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;

  &__icon {
    flex-shrink: 0;
    color: var(--color-accent);
  }

  &__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
  }

  &__label {
    font-weight: 500;
    color: var(--color-primary-text);
    line-height: 1.3;
    font-size: 0.875rem;
  }

  &__module {
    color: var(--color-secondary-text);
    font-size: 0.75rem;
    line-height: 1.2;
  }
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

.audit-severity {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;

  &--info {
    background: color-mix(in srgb, var(--color-accent, #0d6efd) 14%, transparent);
    color: var(--color-accent, #0d6efd);
  }

  &--security {
    background: color-mix(in srgb, var(--bs-warning, #ffc107) 18%, transparent);
    color: var(--bs-warning-text-emphasis, #997404);
  }

  &--critical {
    background: color-mix(in srgb, var(--bs-danger, #dc3545) 12%, transparent);
    color: var(--bs-danger, #dc3545);
  }
}
</style>
