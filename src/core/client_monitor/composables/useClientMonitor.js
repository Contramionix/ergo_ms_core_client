import { ref, computed } from 'vue'
import { apiClient } from '@/js/api/manager.js'
import { logError } from '@/js/utils/logError.js'
import { useToast } from '@/js/utils/toast.js'
import { copyTextToClipboard } from '@/js/utils/clipboard.js'
import { tGlobal } from '@/i18n/index.js'
import { clientMonitorEndpoints as ep } from '@/core/client_monitor/js/endpoints.js'

export function useClientMonitor() {
  const toast = useToast()

  const isLoading = ref(false)
  const sessions = ref([])
  const totalSessions = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(50)
  const searchQuery = ref('')
  const hasErrorsOnly = ref(true)
  const dateFrom = ref('')
  const dateTo = ref('')

  const selectedSession = ref(null)
  const events = ref([])
  const intervals = ref([])
  const eventsLoading = ref(false)
  const eventsPage = ref(1)
  const eventsTotal = ref(0)
  const eventsHasNext = ref(false)

  const filters = computed(() => ({
    has_errors: hasErrorsOnly.value ? 'true' : '',
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
  }))

  async function loadSessions() {
    isLoading.value = true
    try {
      const params = {
        page: currentPage.value,
        page_size: pageSize.value,
      }
      if (searchQuery.value.trim()) {
        params.q = searchQuery.value.trim()
      }
      if (hasErrorsOnly.value) {
        params.has_errors = 'true'
      }
      if (dateFrom.value) {
        params.date_from = `${dateFrom.value}T00:00:00`
      }
      if (dateTo.value) {
        params.date_to = `${dateTo.value}T23:59:59`
      }
      const response = await apiClient.get(ep.clientMonitor.sessions, params)
      const data = response.data || {}
      sessions.value = data.results || []
      totalSessions.value = data.count || 0
    } catch (error) {
      logError(tGlobal('admin.clientMonitor.loadError'), error)
      toast.error(tGlobal('admin.clientMonitor.loadError'))
    } finally {
      isLoading.value = false
    }
  }

  async function openSession(session) {
    selectedSession.value = session
    events.value = []
    intervals.value = []
    eventsPage.value = 1
    await Promise.all([loadEvents(true), loadIntervals()])
  }

  function closeSession() {
    selectedSession.value = null
    events.value = []
    intervals.value = []
  }

  async function loadEvents(reset = false) {
    if (!selectedSession.value) {
      return
    }
    if (reset) {
      eventsPage.value = 1
      events.value = []
    }
    eventsLoading.value = true
    try {
      const response = await apiClient.get(
        ep.clientMonitor.events(selectedSession.value.public_id),
        { page: eventsPage.value, page_size: 100 },
      )
      const data = response.data || {}
      const rows = data.results || []
      events.value = reset ? rows : [...events.value, ...rows]
      eventsTotal.value = data.count || 0
      eventsHasNext.value = Boolean(data.has_next)
    } catch (error) {
      logError(tGlobal('admin.clientMonitor.eventsLoadError'), error)
      toast.error(tGlobal('admin.clientMonitor.eventsLoadError'))
    } finally {
      eventsLoading.value = false
    }
  }

  async function loadMoreEvents() {
    if (!eventsHasNext.value || eventsLoading.value) {
      return
    }
    eventsPage.value += 1
    await loadEvents(false)
  }

  async function loadIntervals() {
    if (!selectedSession.value) {
      return
    }
    try {
      const response = await apiClient.get(
        ep.clientMonitor.intervals(selectedSession.value.public_id),
      )
      intervals.value = response.data?.results || []
    } catch (error) {
      logError(tGlobal('admin.clientMonitor.intervalsLoadError'), error)
    }
  }

  async function copyDebugPack(params = {}) {
    if (!selectedSession.value) {
      return
    }
    try {
      const response = await apiClient.get(
        ep.clientMonitor.debugPack(selectedSession.value.public_id),
        params,
      )
      const markdown = response.data?.markdown
      if (!markdown) {
        toast.error(tGlobal('admin.clientMonitor.copyEmpty'))
        return
      }
      await copyTextToClipboard(markdown)
      toast.success(tGlobal('admin.clientMonitor.copySuccess'))
    } catch (error) {
      logError(tGlobal('admin.clientMonitor.copyError'), error)
      toast.error(tGlobal('admin.clientMonitor.copyError'))
    }

  }

  function handleSearchQuery(value) {
    searchQuery.value = value
    currentPage.value = 1
    void loadSessions()
  }

  function handlePageChange(page) {
    currentPage.value = page
    void loadSessions()
  }

  function applyFilters() {
    currentPage.value = 1
    void loadSessions()
  }

  return {
    isLoading,
    sessions,
    totalSessions,
    currentPage,
    pageSize,
    searchQuery,
    hasErrorsOnly,
    dateFrom,
    dateTo,
    filters,
    selectedSession,
    events,
    intervals,
    eventsLoading,
    eventsTotal,
    eventsHasNext,
    loadSessions,
    openSession,
    closeSession,
    loadMoreEvents,
    copyDebugPack,
    handleSearchQuery,
    handlePageChange,
    applyFilters,
  }
}
