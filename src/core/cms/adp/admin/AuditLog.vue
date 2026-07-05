<script setup>
import { ref, computed, watch, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { Download, RefreshCw, Eye } from 'lucide-vue-next'

import { apiClient } from '@/js/api/manager'
import { auditEndpoints } from '@/core/audit/js/endpoints.js'
import { moduleManager } from '@/modules/index.js'
import { useToast } from '@/js/utils/toast.js'
import { formatDateTime } from '@/js/utils/timeUtils.js'
import { logError } from '@/js/utils/logError.js'
import { buildActorNameVariants, parseErgoFullNameParts } from '@/js/userAvatar.js'
import { CheckAccessToAdminPanel } from '@/core/cms/adp/admin/js/GroupsPolitics'
import DataTable from '@/components/DataTable.vue'
import LoadingContentArea from '@/components/LoadingContentArea.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import SearchInput from '@/components/SearchInput.vue'
import FilterMenu from '@/components/FilterMenu.vue'
import HoverTooltip from '@/components/HoverTooltip.vue'
import AuditEventDetailsModal from '@/core/cms/adp/admin/AuditLogComponents/AuditEventDetailsModal.vue'
import AuditActorCell from '@/core/cms/adp/admin/AuditLogComponents/AuditActorCell.vue'

const router = useRouter()
const toast = useToast()

const isCheckingAccess = ref(true)
const hasAdminAccess = ref(false)
const isLoading = ref(false)
const isRefreshing = ref(false)

const events = ref([])
const totalItems = ref(0)
const currentPage = ref(1)
const rowsPerPage = ref(12)

const searchQuery = ref('')
const auditFilters = ref({
  module: '',
  action: '',
  severity: '',
  actor: '',
  dateFrom: '',
  dateTo: '',
})

const modules = ref([])
const actionsCatalog = ref([])
const severities = ref([])
const actors = ref([])
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
  const list = auditFilters.value.module
    ? actionsCatalog.value.filter((a) => a.module === auditFilters.value.module)
    : actionsCatalog.value
  return list.map((a) => ({ value: a.action, label: a.label }))
})

const severityOptions = computed(() =>
  severities.value.map((s) => ({ value: s.value, label: s.label })),
)

function formatActorFilterLabel(fullLabel) {
  const label = (fullLabel || '').trim()
  if (!label) return ''
  const variants = buildActorNameVariants({
    ...parseErgoFullNameParts(label),
    fallbackLabel: label,
  })
  return variants.compactDisplay || variants.expandedDisplay || label
}

const actorOptions = computed(() =>
  actors.value.map((actor) => {
    const fullLabel = (actor.label || '').trim()
    const nameParts = parseErgoFullNameParts(fullLabel)
    const isOrphan = String(actor.value || '').startsWith('label:')
    return {
      value: actor.value,
      label: formatActorFilterLabel(fullLabel),
      searchLabel: fullLabel,
      userRef: isOrphan ? null : actor.value,
      firstName: nameParts.firstName,
      lastName: nameParts.lastName,
    }
  }),
)

const auditFilterFields = computed(() => [
  { type: 'heading', label: 'Событие' },
  {
    type: 'select',
    key: 'module',
    label: 'Модуль',
    options: moduleOptions.value,
    valueKey: 'value',
    labelKey: 'label',
    includeAllOption: true,
    allLabel: 'Все модули',
    searchable: true,
  },
  {
    type: 'select',
    key: 'action',
    label: 'Действие',
    options: actionOptions.value,
    valueKey: 'value',
    labelKey: 'label',
    includeAllOption: true,
    allLabel: 'Все действия',
    searchable: true,
  },
  {
    type: 'select',
    key: 'severity',
    label: 'Важность',
    options: severityOptions.value,
    valueKey: 'value',
    labelKey: 'label',
    includeAllOption: true,
    allLabel: 'Любая важность',
  },
  {
    type: 'select',
    key: 'actor',
    label: 'Инициатор',
    options: actorOptions.value,
    valueKey: 'value',
    labelKey: 'label',
    includeAllOption: true,
    allLabel: 'Все инициаторы',
    searchable: true,
    showOptionAvatars: true,
  },
  { type: 'heading', label: 'Период' },
  { type: 'date', key: 'dateFrom', label: 'С' },
  { type: 'date', key: 'dateTo', label: 'По' },
])

function resolveFilterDisplayValue(field, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return ''
  if (field.type === 'date') return String(rawValue)
  if (field.type === 'select') {
    const valueKey = field.valueKey || 'value'
    const labelKey = field.labelKey || 'label'
    const found = (field.options || []).find((opt) => {
      const value = typeof opt === 'object' && opt !== null ? opt[valueKey] : opt
      return String(value) === String(rawValue)
    })
    if (found && typeof found === 'object') return found[labelKey] ?? String(rawValue)
    if (found != null) return String(found)
    return String(rawValue)
  }
  return String(rawValue)
}

const auditFiltersTooltip = computed(() => {
  const parts = []
  for (const field of auditFilterFields.value) {
    if (field.type === 'heading') continue
    const display = resolveFilterDisplayValue(field, auditFilters.value[field.key])
    if (display) parts.push(display)
  }
  return parts.join(', ')
})

watch(
  () => auditFilters.value.module,
  (nextModule, prevModule) => {
    if (nextModule === prevModule) return
    const hadAction = Boolean(auditFilters.value.action)
    auditFilters.value = {
      ...auditFilters.value,
      action: '',
    }
    if (hadAction) applyFilters()
  },
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

function hasDetails(event) {
  return (Array.isArray(event.changes) && event.changes.length > 0)
    || (event.meta && Object.keys(event.meta).length > 0)
}

function ipLocationTooltip(item) {
  const ip = (item?.ip_address || '').trim()
  if (!ip) return ''
  const location = (item?.ip_location || '').trim()
  return location || 'Местоположение неизвестно'
}

function hasIpLocationTooltip(item) {
  return Boolean((item?.ip_address || '').trim())
}

const getItemKey = (item) => item.id

function resolveActorQueryParams(actorValue) {
  const value = (actorValue || '').trim()
  if (!value) return {}
  if (value.startsWith('label:')) {
    try {
      return { actor_label: decodeURIComponent(value.slice(6)) }
    } catch {
      return { actor_label: value.slice(6) }
    }
  }
  return { actor_ref: value }
}

async function loadCatalog() {
  try {
    const result = await apiClient.get(auditEndpoints.audit.catalog, {}, true)
    const data = result?.data || {}
    modules.value = data.modules || []
    actionsCatalog.value = data.actions || []
    severities.value = data.severities || []
    actors.value = data.actors || []
  } catch (error) {
    logError('Аудит: не удалось загрузить каталог', error)
  }
}

async function loadEvents({ spinRefresh = false } = {}) {
  if (spinRefresh) isRefreshing.value = true
  isLoading.value = true
  try {
    const params = { page: currentPage.value, page_size: rowsPerPage.value }
    if (auditFilters.value.module) params.source_module = auditFilters.value.module
    if (auditFilters.value.action) params.action = auditFilters.value.action
    if (auditFilters.value.severity) params.severity = auditFilters.value.severity
    Object.assign(params, resolveActorQueryParams(auditFilters.value.actor))
    if (searchQuery.value.trim()) params.q = searchQuery.value.trim()
    if (auditFilters.value.dateFrom) params.date_from = auditFilters.value.dateFrom
    if (auditFilters.value.dateTo) params.date_to = auditFilters.value.dateTo

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
    isRefreshing.value = false
  }
}

function refreshEvents() {
  loadEvents({ spinRefresh: true })
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
  if (auditFilters.value.module) params.source_module = auditFilters.value.module
  if (auditFilters.value.action) params.action = auditFilters.value.action
  if (auditFilters.value.severity) params.severity = auditFilters.value.severity
  Object.assign(params, resolveActorQueryParams(auditFilters.value.actor))
  if (searchQuery.value.trim()) params.q = searchQuery.value.trim()
  if (auditFilters.value.dateFrom) params.date_from = auditFilters.value.dateFrom
  if (auditFilters.value.dateTo) params.date_to = auditFilters.value.dateTo

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
      <div class="table-header audit-toolbar">
        <div class="filters-wrapper">
          <SearchInput id="audit-search" :model-value="searchQuery" layout="grow" placeholder="Инициатор или объект..." :show-icon="true" background="primary" focus-border="primary" class="audit-search-input" @update:model-value="handleSearchQuery"/>
          <div class="audit-filter-menu-wrap">
            <HoverTooltip :text="auditFiltersTooltip" wrap>
              <FilterMenu v-model="auditFilters" :fields="auditFilterFields" trigger-label="Фильтры" apply-on-change class="audit-filter-menu" @apply="applyFilters"/>
            </HoverTooltip>
          </div>
        </div>

        <div class="actions-wrapper">
          <HoverTooltip text="Обновить">
            <button type="button" class="btn audit-toolbar-icon-btn" aria-label="Обновить" :disabled="isLoading" @click="refreshEvents">
              <RefreshCw :size="20" class="audit-refresh-icon" :class="{ 'audit-refresh-icon--spinning': isRefreshing }" aria-hidden="true" />
            </button>
          </HoverTooltip>
          <HoverTooltip text="Экспорт CSV">
            <button type="button" class="btn audit-toolbar-icon-btn" aria-label="Экспорт CSV" @click="exportCsv">
              <Download :size="20" aria-hidden="true" />
            </button>
          </HoverTooltip>
        </div>
      </div>

      <LoadingContentArea :loading="isLoading">
        <DataTable :items="events" :columns="columns" :show-number-column="false" :items-per-page="rowsPerPage" :current-page="currentPage" :total-items="totalItems" :get-item-key="getItemKey" :enable-pagination="true" empty-text="Записи не найдены" @update:current-page="handlePageChange">
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
            {{ item.entity_label || '—' }}
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
              <button v-if="hasDetails(item)" type="button" class="btn-action" title="Подробности" aria-label="Подробности" @click.stop="openDetails(item)">
                <Eye :size="15" />
              </button>
            </div>
          </template>
        </DataTable>
      </LoadingContentArea>
    </div>

    <AuditEventDetailsModal :visible="showDetailsModal" :event="selectedEvent" @close="closeDetails"/>
  </div>
</template>

<style scoped lang="scss">
@import './admin-page.scss';

.loading-container {
  min-height: 400px;
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

.audit-search-input {
  flex: 1 1 0;
  min-width: 180px;
  max-width: none;
}

.audit-filter-menu-wrap {
  flex: 0 0 auto;

  :deep(.hover-tooltip) {
    display: contents;
  }
}

.audit-filter-menu {
  min-width: 150px;

  --filter-menu-trigger-font-size: 1rem;
  --select-box-font-size: 0.875rem;
}

.audit-toolbar .actions-wrapper {
  align-items: flex-end;
  flex-shrink: 0;

  :deep(.hover-tooltip) {
    flex: 0 0 auto;
  }
}

.audit-toolbar-icon-btn {
  display: inline-flex;
  background-color: transparent;
  border-radius: 1.5rem;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;

  &:hover:not(:disabled) {
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
}

.audit-ip--has-location {
  cursor: help;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
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
</style>