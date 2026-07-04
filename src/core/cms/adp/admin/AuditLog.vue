<script setup>
import { ref, computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { Download, RefreshCw, Eye } from 'lucide-vue-next'

import { apiClient } from '@/js/api/manager'
import { auditEndpoints } from '@/core/audit/js/endpoints.js'
import { moduleManager } from '@/modules/index.js'
import { useToast } from '@/js/utils/toast.js'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import { logError } from '@/js/utils/logError.js'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import DataTable from '@/components/DataTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import SelectBox from '@/components/SelectBox.vue'
import ModalCenter from '@/components/ModalCenter.vue'

const router = useRouter()
const toast = useToast()

const isCheckingAccess = ref(true)
const hasAdminAccess = ref(false)
const isLoading = ref(false)

const events = ref([])
const totalItems = ref(0)
const currentPage = ref(1)
const rowsPerPage = ref(12)

const moduleFilter = ref('')
const actionFilter = ref('')
const severityFilter = ref('')
const searchQuery = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const modules = ref([])
const actionsCatalog = ref([])
const severities = ref([])
const selectedEvent = ref(null)
const showDetailsModal = ref(false)

const SEVERITY_META = {
  info: { label: 'Информация', cls: 'audit-severity--info' },
  security: { label: 'Безопасность', cls: 'audit-severity--security' },
  critical: { label: 'Критично', cls: 'audit-severity--critical' },
}

const moduleOptions = computed(() =>
  modules.value.map((m) => ({ value: m.module, label: m.module_label })),
)

const actionOptions = computed(() => {
  const list = moduleFilter.value
    ? actionsCatalog.value.filter((a) => a.module === moduleFilter.value)
    : actionsCatalog.value
  return list.map((a) => ({ value: a.action, label: a.label }))
})

const severityOptions = computed(() =>
  severities.value.map((s) => ({ value: s.value, label: s.label })),
)

const listSummary = computed(() => {
  if (!totalItems.value && !hasActiveFilters.value) {
    return 'Записей пока нет'
  }
  const parts = [`Найдено: ${totalItems.value}`]
  const totalPages = Math.max(1, Math.ceil(totalItems.value / rowsPerPage.value))
  if (totalPages > 1) {
    parts.push(`страница ${currentPage.value} из ${totalPages}`)
  }
  return parts.join(' · ')
})

const hasActiveFilters = computed(() =>
  Boolean(
    moduleFilter.value
    || actionFilter.value
    || severityFilter.value
    || searchQuery.value.trim()
    || dateFrom.value
    || dateTo.value,
  ),
)

const iconCache = shallowRef({})

const columns = [
  { key: 'created_at', label: 'Время', headerStyle: { whiteSpace: 'nowrap' } },
  { key: 'action', label: 'Действие' },
  { key: 'actor_label', label: 'Инициатор' },
  { key: 'entity_label', label: 'Объект' },
  { key: 'severity', label: 'Важность', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'ip_address', label: 'IP' },
  { key: 'actions', label: '', headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right' } },
]

function resolveIcon(name) {
  const key = name || 'Activity'
  if (iconCache.value[key]) return iconCache.value[key]
  const icon = moduleManager?.icons?.getIcon?.(key) || moduleManager?.icons?.getIcon?.('Activity')
  iconCache.value = { ...iconCache.value, [key]: icon }
  return icon
}

function severityMeta(value) {
  return SEVERITY_META[value] || SEVERITY_META.info
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function hasDetails(event) {
  return (Array.isArray(event.changes) && event.changes.length > 0)
    || (event.meta && Object.keys(event.meta).length > 0)
}

const getItemKey = (item) => item.id

async function loadCatalog() {
  try {
    const result = await apiClient.get(auditEndpoints.audit.catalog, {}, true)
    const data = result?.data || {}
    modules.value = data.modules || []
    actionsCatalog.value = data.actions || []
    severities.value = data.severities || []
  } catch (error) {
    logError('Аудит: не удалось загрузить каталог', error)
  }
}

async function loadEvents() {
  isLoading.value = true
  try {
    const params = { page: currentPage.value, page_size: rowsPerPage.value }
    if (moduleFilter.value) params.source_module = moduleFilter.value
    if (actionFilter.value) params.action = actionFilter.value
    if (severityFilter.value) params.severity = severityFilter.value
    if (searchQuery.value.trim()) params.q = searchQuery.value.trim()
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value) params.date_to = dateTo.value

    const result = await apiClient.get(auditEndpoints.audit.events, params, true)
    const data = result?.data || {}
    events.value = data.results || []
    totalItems.value = data.count ?? events.value.length
    if (data.page) {
      currentPage.value = data.page
    }
  } catch (error) {
    logError('Аудит: не удалось загрузить журнал', error)
    toast.error('Не удалось загрузить журнал действий')
  } finally {
    isLoading.value = false
  }
}

function applyFilters() {
  currentPage.value = 1
  loadEvents()
}

let searchTimer = null
function handleSearchQuery(query) {
  searchQuery.value = query
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, 350)
}

function onModuleChange() {
  actionFilter.value = ''
  applyFilters()
}

function resetFilters() {
  moduleFilter.value = ''
  actionFilter.value = ''
  severityFilter.value = ''
  searchQuery.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  applyFilters()
}

function handlePageChange(page) {
  currentPage.value = page
  loadEvents()
}

function openDetails(event) {
  if (!hasDetails(event)) return
  selectedEvent.value = event
  showDetailsModal.value = true
}

function closeDetails() {
  showDetailsModal.value = false
  selectedEvent.value = null
}

async function exportCsv() {
  const params = {}
  if (moduleFilter.value) params.source_module = moduleFilter.value
  if (actionFilter.value) params.action = actionFilter.value
  if (severityFilter.value) params.severity = severityFilter.value
  if (searchQuery.value.trim()) params.q = searchQuery.value.trim()
  if (dateFrom.value) params.date_from = dateFrom.value
  if (dateTo.value) params.date_to = dateTo.value

  try {
    const result = await apiClient.downloadFile(auditEndpoints.audit.export, params, 'GET', true)
    if (!result?.success || !(result.data instanceof Blob)) {
      toast.error('Не удалось выгрузить журнал')
      return
    }
    const url = URL.createObjectURL(result.data)
    const link = document.createElement('a')
    link.href = url
    link.download = 'audit_log.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    logError('Аудит: ошибка экспорта', error)
    toast.error('Не удалось выгрузить журнал')
  }
}

onMounted(async () => {
  try {
    const accessData = await CheckAccessToAdminPanel()
    if (!accessData.access_to_panel) {
      toast.error('У вас нет доступа к административной панели')
      router.push({ name: 'AccessDenied' })
      return
    }
    hasAdminAccess.value = true
    await loadCatalog()
    await loadEvents()
  } catch (error) {
    logError('Аудит: ошибка проверки прав', error)
    router.push({ name: 'AccessDenied' })
  } finally {
    isCheckingAccess.value = false
  }
})
</script>

<template>
  <div v-if="isCheckingAccess" class="d-flex justify-content-center align-items-center loading-container">
    <SpinnerLoading color="primary" />
  </div>

  <div v-else-if="hasAdminAccess" class="admin-page">
    <div class="page-header">
      <h1 class="page-title">Журнал действий</h1>
      <p class="page-subtitle">Централизованный аудит действий пользователей в ядре и модулях</p>
    </div>

    <div class="content-card">
      <p class="audit-summary">{{ listSummary }} · {{ rowsPerPage }} на странице</p>

      <div class="table-header audit-toolbar">
        <div class="filters-wrapper">
          <div class="search-wrapper">
            <label for="audit-search" class="form-label mb-1">Поиск</label>
            <input
              id="audit-search"
              type="search"
              class="form-control search-input"
              placeholder="Инициатор или объект..."
              :value="searchQuery"
              @input="handleSearchQuery($event.target.value)"
            />
          </div>

          <div class="filter-field">
            <SelectBox
              id="audit-module-filter"
              v-model="moduleFilter"
              label="Модуль"
              :options="moduleOptions"
              value-key="value"
              label-key="label"
              :include-all-option="true"
              all-label="Все модули"
              searchable
              fixed-trigger-label-font-size
              @update:model-value="onModuleChange"
            />
          </div>

          <div class="filter-field">
            <SelectBox
              id="audit-action-filter"
              v-model="actionFilter"
              label="Действие"
              :options="actionOptions"
              value-key="value"
              label-key="label"
              :include-all-option="true"
              all-label="Все действия"
              searchable
              fixed-trigger-label-font-size
              @update:model-value="applyFilters"
            />
          </div>

          <div class="filter-field">
            <SelectBox
              id="audit-severity-filter"
              v-model="severityFilter"
              label="Важность"
              :options="severityOptions"
              value-key="value"
              label-key="label"
              :include-all-option="true"
              all-label="Любая важность"
              fixed-trigger-label-font-size
              @update:model-value="applyFilters"
            />
          </div>

          <div class="date-filter">
            <label for="audit-date-from" class="form-label mb-1">С</label>
            <input
              id="audit-date-from"
              v-model="dateFrom"
              type="date"
              class="form-control search-input"
              @change="applyFilters"
            />
          </div>

          <div class="date-filter">
            <label for="audit-date-to" class="form-label mb-1">По</label>
            <input
              id="audit-date-to"
              v-model="dateTo"
              type="date"
              class="form-control search-input"
              @change="applyFilters"
            />
          </div>

          <button
            type="button"
            class="btn btn-outline-secondary audit-reset-btn"
            :disabled="!hasActiveFilters"
            @click="resetFilters"
          >
            Сбросить
          </button>
        </div>

        <div class="actions-wrapper">
          <button
            type="button"
            class="btn btn-outline-secondary d-flex align-items-center gap-2"
            :disabled="isLoading"
            @click="loadEvents"
          >
            <RefreshCw :size="16" />
            <span>Обновить</span>
          </button>
          <button
            type="button"
            class="btn btn-primary d-flex align-items-center gap-2"
            @click="exportCsv"
          >
            <Download :size="16" />
            <span>Экспорт CSV</span>
          </button>
        </div>
      </div>

      <LoadingContentArea :loading="isLoading">
        <div v-if="!events.length" class="audit-empty text-muted">
          Записи не найдены
        </div>

        <DataTable
          v-else
          :items="events"
          :columns="columns"
          :show-number-column="false"
          :items-per-page="rowsPerPage"
          :current-page="currentPage"
          :total-items="totalItems"
          :get-item-key="getItemKey"
          :enable-pagination="true"
          @update:current-page="handlePageChange"
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
            {{ item.actor_label || '—' }}
          </template>

          <template #cell-entity_label="{ item }">
            {{ item.entity_label || '—' }}
          </template>

          <template #cell-severity="{ item }">
            <span class="audit-severity" :class="severityMeta(item.severity).cls">
              {{ severityMeta(item.severity).label }}
            </span>
          </template>

          <template #cell-ip_address="{ item }">
            <span class="text-muted">{{ item.ip_address || '—' }}</span>
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
    </div>

    <ModalCenter
      standalone
      modal-id="auditEventDetails"
      :title="selectedEvent?.action_label || 'Подробности события'"
      :visible="showDetailsModal"
      size="lg"
      @close="closeDetails"
    >
      <template v-if="selectedEvent">
        <div class="audit-detail-meta">
          <div><span class="text-muted">Время:</span> {{ formatDateTime(selectedEvent.created_at) }}</div>
          <div><span class="text-muted">Инициатор:</span> {{ selectedEvent.actor_label || '—' }}</div>
          <div v-if="selectedEvent.entity_label">
            <span class="text-muted">Объект:</span> {{ selectedEvent.entity_label }}
          </div>
          <div v-if="selectedEvent.ip_address">
            <span class="text-muted">IP:</span> {{ selectedEvent.ip_address }}
          </div>
        </div>

        <div v-if="selectedEvent.changes?.length" class="audit-changes">
          <h6 class="audit-detail-heading">Изменения</h6>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0 audit-changes__table">
              <thead>
                <tr>
                  <th>Поле</th>
                  <th>Было</th>
                  <th>Стало</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(change, idx) in selectedEvent.changes" :key="idx">
                  <td>{{ change.label || change.field }}</td>
                  <td class="audit-old">{{ formatValue(change.old) }}</td>
                  <td class="audit-new">{{ formatValue(change.new) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="selectedEvent.meta && Object.keys(selectedEvent.meta).length" class="audit-meta">
          <h6 class="audit-detail-heading">Метаданные</h6>
          <pre class="audit-meta__pre">{{ JSON.stringify(selectedEvent.meta, null, 2) }}</pre>
        </div>
      </template>

      <template #footer>
        <button type="button" class="btn btn-secondary" @click="closeDetails">Закрыть</button>
      </template>
    </ModalCenter>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: 400px;
}

.audit-summary {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}

.filters-wrapper {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.75rem;
  flex: 1 1 auto;
  min-width: 0;
}

.audit-toolbar {
  align-items: flex-end;
}

.search-wrapper {
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
}

.search-wrapper .search-input,
.date-filter .search-input {
  min-height: 38px;
}

.filter-field {
  flex: 0 1 200px;
  min-width: 170px;

  :deep(.select-box) {
    --select-box-font-size: 0.875rem;
  }
}

.date-filter {
  flex: 0 1 150px;
  min-width: 140px;
  display: flex;
  flex-direction: column;
}

.audit-reset-btn {
  min-height: 38px;
  align-self: flex-end;
}

.audit-toolbar .actions-wrapper {
  align-items: flex-end;

  .btn {
    min-height: 38px;
  }
}

.audit-empty {
  padding: 2rem 0;
  text-align: center;
  font-size: 0.875rem;
}

.audit-time {
  white-space: nowrap;
  color: var(--color-secondary-text);
}

.audit-action {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;

  &__icon {
    flex-shrink: 0;
    color: var(--color-accent);
  }

  &__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__label {
    font-weight: 500;
    color: var(--color-primary-text);
  }

  &__module {
    color: var(--color-secondary-text);
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

.audit-detail-meta {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--color-primary-text);
}

.audit-detail-heading {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-secondary-text);
}

.audit-changes {
  margin-bottom: 1rem;

  &__table {
    font-size: 0.8125rem;

    th {
      color: var(--color-secondary-text);
      font-weight: 600;
    }
  }
}

.audit-old {
  color: var(--bs-danger, #dc3545);
}

.audit-new {
  color: var(--bs-success, #198754);
}

.audit-meta {
  &__pre {
    margin: 0;
    padding: 0.75rem;
    background: var(--color-secondary-background);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    max-height: 260px;
    overflow: auto;
    color: var(--color-primary-text);
  }
}
</style>
