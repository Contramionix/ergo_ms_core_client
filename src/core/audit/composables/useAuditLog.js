import { ref, computed, watch, shallowRef } from 'vue'
import {
  useRouteQueryState,
  filtersObjectFromState,
  filtersObjectToPatch,
} from '@/composables/useRouteQueryState.js'
import { apiClient } from '@/js/api/manager'
import { auditEndpoints } from '@/core/audit/js/endpoints.js'
import { moduleManager } from '@/modules/index.js'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import { buildActorNameVariants, parseErgoFullNameParts } from '@/js/userAvatar.js'

export const AUDIT_FILTER_MAP = {
  module: 'module',
  action: 'action',
  severity: 'severity',
  actor: 'actor',
  date_from: 'dateFrom',
  date_to: 'dateTo',
}

export const SEVERITY_META = {
  info: { label: 'Информация', cls: 'audit-severity--info' },
  security: { label: 'Безопасность', cls: 'audit-severity--security' },
  critical: { label: 'Критично', cls: 'audit-severity--critical' },
}

export const AUDIT_COLUMNS = [
  { key: 'created_at', label: 'Время', headerStyle: { whiteSpace: 'nowrap' } },
  { key: 'action', label: 'Действие' },
  { key: 'actor_label', label: 'Инициатор' },
  { key: 'entity_label', label: 'Объект' },
  { key: 'severity', label: 'Важность', headerStyle: { textAlign: 'center' }, cellStyle: { textAlign: 'center' } },
  { key: 'ip_address', label: 'IP' },
  { key: 'actions', label: '', headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right' } },
]

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

function formatActorFilterLabel(fullLabel) {
  const label = (fullLabel || '').trim()
  if (!label) return ''
  const variants = buildActorNameVariants({
    ...parseErgoFullNameParts(label),
    fallbackLabel: label,
  })
  return variants.compactDisplay || variants.expandedDisplay || label
}

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

/**
 * @param {object} options
 * @param {import('vue').Ref<object|null>|object|null} [options.scopeParams]
 *   Доменный scope-фильтр журнала: объект query-параметров (например,
 *   { my_scope_id: 5 }). Ядро не знает конкретных ключей — их задаёт
 *   модуль-владелец домена.
 * @param {boolean} [options.syncRouteQuery=true]
 */
export function useAuditLog(options = {}) {
  const toast = useToast()

  const scopeParamsOption = options.scopeParams ?? null
  const syncRouteQuery = options.syncRouteQuery !== false

  const isLoading = ref(false)
  const isRefreshing = ref(false)
  const isQueryWatchReady = ref(false)
  const isReady = ref(false)

  const events = ref([])
  const totalEvents = ref(0)
  const rowsPerPage = ref(12)

  const modules = ref([])
  const actionsCatalog = ref([])
  const severities = ref([])
  const actors = ref([])
  const selectedEvent = ref(null)
  const showDetailsModal = ref(false)

  const iconCache = shallowRef({})

  const routeQuery = syncRouteQuery
    ? useRouteQueryState({
      q: { default: '' },
      page: { default: 1, type: 'number' },
      module: { default: '' },
      action: { default: '' },
      severity: { default: '' },
      actor: { default: '' },
      date_from: { default: '' },
      date_to: { default: '' },
    }, { debounceKeys: ['q'] })
    : null

  const localState = ref({
    q: '',
    page: 1,
    module: '',
    action: '',
    severity: '',
    actor: '',
    date_from: '',
    date_to: '',
  })

  const listState = routeQuery?.state ?? localState

  const patchState = routeQuery?.patchState ?? ((patch, opts = {}) => {
    const next = { ...localState.value, ...patch }
    if (opts.immediate !== false && patch.page !== undefined) {
      localState.value = next
      return Promise.resolve()
    }
    localState.value = next
    return Promise.resolve()
  })

  const watchState = routeQuery?.watchState ?? ((callback) => {
    watch(localState, callback, { deep: true })
  })

  const searchQuery = computed(() => listState.value.q)
  const currentPage = computed(() => listState.value.page)

  const auditFilters = computed({
    get: () => filtersObjectFromState(listState.value, AUDIT_FILTER_MAP),
    set: (filters) => {
      patchState(filtersObjectToPatch(filters, AUDIT_FILTER_MAP), { immediate: true })
    },
  })

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
    () => listState.value.module,
    (nextModule, prevModule) => {
      if (nextModule === prevModule || !listState.value.action) return
      patchState({ action: '' }, { immediate: true })
    },
  )

  function resolveScopeParams() {
    const raw = scopeParamsOption?.value ?? scopeParamsOption
    if (!raw || typeof raw !== 'object') return {}
    const params = {}
    for (const [key, value] of Object.entries(raw)) {
      if (value === null || value === undefined || value === '') continue
      params[key] = value
    }
    return params
  }

  function buildListParams() {
    const params = {
      page: currentPage.value,
      page_size: rowsPerPage.value,
      ...resolveScopeParams(),
    }
    if (auditFilters.value.module) params.source_module = auditFilters.value.module
    if (auditFilters.value.action) params.action = auditFilters.value.action
    if (auditFilters.value.severity) params.severity = auditFilters.value.severity
    Object.assign(params, resolveActorQueryParams(auditFilters.value.actor))
    if (searchQuery.value.trim()) params.q = searchQuery.value.trim()
    if (auditFilters.value.dateFrom) params.date_from = auditFilters.value.dateFrom
    if (auditFilters.value.dateTo) params.date_to = auditFilters.value.dateTo
    return params
  }

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
    return Boolean(event?.id)
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

  async function loadCatalog() {
    try {
      const result = await apiClient.get(
        auditEndpoints.audit.catalog,
        resolveScopeParams(),
        true,
      )
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
      const result = await apiClient.get(auditEndpoints.audit.events, buildListParams(), true)
      const data = result?.data || {}
      events.value = data.results || []
      totalEvents.value = typeof data.count === 'number' ? data.count : 0

      if (typeof data.page === 'number' && data.page >= 1 && data.page !== listState.value.page) {
        await patchState({ page: data.page }, { immediate: true, silent: true })
        return
      }

      if (events.value.length === 0 && listState.value.page > 1) {
        await patchState({ page: 1 }, { immediate: true, silent: true })
        await loadEvents({ spinRefresh })
      }
    } catch (error) {
      logError('Аудит: не удалось загрузить журнал', error)
      toast.error('Не удалось загрузить журнал действий')
    } finally {
      isLoading.value = false
      isRefreshing.value = false
    }
  }

  async function openDetails(event) {
    if (!event?.id) return
    showDetailsModal.value = true
    selectedEvent.value = event
    try {
      const result = await apiClient.get(`${auditEndpoints.audit.events}${event.id}/`, {}, true)
      if (result?.data) {
        selectedEvent.value = result.data
      }
    } catch (error) {
      logError('Аудит: не удалось загрузить детали события', error)
      toast.error('Не удалось загрузить детали события')
      showDetailsModal.value = false
      selectedEvent.value = null
    }
  }

  function refreshEvents() {
    loadEvents({ spinRefresh: true })
  }

  function handleSearchQuery(query) {
    patchState({ q: query })
  }

  function handlePageChange(page) {
    const nextPage = Number(page)
    if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage === listState.value.page) {
      return
    }
    patchState({ page: nextPage }, { immediate: true })
  }

  function closeDetails() {
    showDetailsModal.value = false
    selectedEvent.value = null
  }

  async function exportCsv() {
    try {
      const result = await apiClient.downloadFile(
        auditEndpoints.audit.export,
        buildListParams(),
        'GET',
        true,
      )
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

  async function initialize() {
    await loadCatalog()
    await loadEvents()
    isReady.value = true
    isQueryWatchReady.value = true
  }

  watchState(() => {
    if (!isQueryWatchReady.value || !isReady.value) {
      return
    }
    loadEvents()
  })

  return {
    isLoading,
    isRefreshing,
    isReady,
    events,
    totalEvents,
    rowsPerPage,
    searchQuery,
    currentPage,
    auditFilters,
    auditFilterFields,
    auditFiltersTooltip,
    selectedEvent,
    showDetailsModal,
    resolveIcon,
    severityMeta,
    hasDetails,
    ipLocationTooltip,
    hasIpLocationTooltip,
    getItemKey,
    loadCatalog,
    loadEvents,
    initialize,
    openDetails,
    refreshEvents,
    handleSearchQuery,
    handlePageChange,
    closeDetails,
    exportCsv,
  }
}
