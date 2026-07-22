import { ref, computed } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import { logError } from '@/js/utils/logError.js'
import tokenService from '@/core/cms/js/tokenService'
import { connectNotificationsTransport } from '@/js/realtime/notificationsTransport.js'
import { isHttpPollingMode, isSseMode } from '@/js/realtime/config.js'
import { isRealtimeEnvelope } from '@/js/realtime/envelope.js'
import { notificationsApi } from './notifications-api'

const SIDEBAR_WEEK_MS = 7 * 24 * 60 * 60 * 1000
const HISTORY_PAGE_SIZE = 30
const SIDEBAR_PAGE_SIZE = 20

const items = ref([])
const sidebarItems = ref([])
const unreadCount = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const sidebarLoading = ref(false)
const connected = ref(false)
const hasMore = ref(false)
const listTotal = ref(0)
const sourceModules = ref([])
const listArchived = ref(false)

let wsConnection = null
let intentionalClose = false
let initialized = false
let listOffset = 0
let listFilters = { is_read: null, source_module: '' }

export function matchesSidebarFilter(notification) {
  if (notification?.sidebar_hidden_at) return false
  if (notification?.archived_at || notification?.deleted_at) return false
  if (!notification?.is_read) return true
  const refDate = notification.read_at || notification.created_at
  if (!refDate) return false
  return Date.now() - new Date(refDate).getTime() <= SIDEBAR_WEEK_MS
}

function applyReadState(notification, readAt) {
  notification.is_read = true
  notification.read_at = readAt
}

function findNotification(id) {
  return items.value.find((n) => n.id === id) || sidebarItems.value.find((n) => n.id === id)
}

function syncUnreadFromResponse(data) {
  if (typeof data?.unread_count === 'number') {
    unreadCount.value = data.unread_count
  }
}

function removeFromLists(id) {
  items.value = items.value.filter((n) => n.id !== id)
  sidebarItems.value = sidebarItems.value.filter((n) => n.id !== id)
}

function syncPollingCursorFromItems() {
  if (!(isHttpPollingMode() || isSseMode()) || !wsConnection?.setLastNotificationId) {
    return
  }
  const maxId = items.value.reduce((max, item) => Math.max(max, item?.id ?? 0), 0)
  if (maxId > 0) {
    wsConnection.setLastNotificationId(maxId)
  }
}

function openSocket() {
  if (!tokenService.getAccess()) return

  if (wsConnection && !intentionalClose) return

  intentionalClose = false
  wsConnection?.close()

  wsConnection = connectNotificationsTransport({
    onAuthenticated: () => {
      connected.value = true
      syncPollingCursorFromItems()
    },
    onMessage: handleSocketMessage,
    onPollMeta: ({ unreadCount: polledCount }) => {
      if (typeof polledCount === 'number') {
        unreadCount.value = polledCount
      }
    },
    onClose: (_event, wasIntentional) => {
      connected.value = false
      if (wasIntentional || intentionalClose) {
        wsConnection = null
      }
    },
    onError: () => {
      connected.value = false
    },
  })
}

function parseListResponse(listResp) {
  const payload = listResp?.data
  if (Array.isArray(payload)) {
    return { list: payload, total: payload.length, next: null }
  }
  const list = payload?.results ?? []
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(payload?.count ?? list.length),
    next: payload?.next || null,
  }
}

async function loadInitial(filters = {}) {
  if (loading.value) return
  loading.value = true
  listFilters = {
    is_read: filters.is_read ?? null,
    source_module: filters.source_module || '',
  }
  listArchived.value = Boolean(filters.archived)
  listOffset = 0
  try {
    const params = {
      limit: HISTORY_PAGE_SIZE,
      offset: 0,
    }
    if (listFilters.is_read === true) params.is_read = 'true'
    if (listFilters.is_read === false) params.is_read = 'false'
    if (listFilters.source_module) params.source_module = listFilters.source_module
    if (listArchived.value) params.archived = '1'

    const [listResp, countResp, modulesResp] = await Promise.all([
      notificationsApi.list(params),
      notificationsApi.unreadCount(),
      notificationsApi.sourceModules().catch(() => null),
    ])
    const { list, total, next } = parseListResponse(listResp)
    items.value = list
    listTotal.value = total
    hasMore.value = Boolean(next) || list.length < total
    listOffset = list.length
    unreadCount.value = Number(countResp?.data?.count ?? 0)
    if (modulesResp?.data?.results) {
      sourceModules.value = modulesResp.data.results
    }
    syncPollingCursorFromItems()
  } catch {
    items.value = []
    listTotal.value = 0
    hasMore.value = false
    unreadCount.value = 0
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const params = {
      limit: HISTORY_PAGE_SIZE,
      offset: listOffset,
    }
    if (listFilters.is_read === true) params.is_read = 'true'
    if (listFilters.is_read === false) params.is_read = 'false'
    if (listFilters.source_module) params.source_module = listFilters.source_module
    if (listArchived.value) params.archived = '1'

    const listResp = await notificationsApi.list(params)
    const { list, total, next } = parseListResponse(listResp)
    const existing = new Set(items.value.map((n) => n.id))
    const appended = list.filter((n) => !existing.has(n.id))
    items.value = [...items.value, ...appended]
    listTotal.value = total
    listOffset += list.length
    hasMore.value = Boolean(next) || listOffset < total
  } catch (e) {
    logError('notifications loadMore:', e)
  } finally {
    loadingMore.value = false
  }
}

async function loadSidebar() {
  if (sidebarLoading.value) return
  sidebarLoading.value = true
  try {
    const listResp = await notificationsApi.list({
      limit: SIDEBAR_PAGE_SIZE,
      offset: 0,
      inbox: 'sidebar',
    })
    const { list } = parseListResponse(listResp)
    sidebarItems.value = list
  } catch {
    sidebarItems.value = []
  } finally {
    sidebarLoading.value = false
  }
}

function applyNotificationUpdate(notification) {
  if (!notification?.id) return
  const inItems = items.value.find((n) => n.id === notification.id)
  const inSidebar = sidebarItems.value.find((n) => n.id === notification.id)
  if (inItems) Object.assign(inItems, notification)
  if (inSidebar) Object.assign(inSidebar, notification)
}

async function executeAction(id, actionId) {
  try {
    const resp = await notificationsApi.executeAction(id, actionId)
    const data = resp?.data ?? resp
    const envelope = data?.envelope
    if (data?.success && isRealtimeEnvelope(envelope)) {
      applyNotificationUpdate(envelope.payload)
      syncUnreadFromResponse(data)
    }
    return data
  } catch (e) {
    logError('executeAction:', e)
    return { success: false }
  }
}

export async function executeNotificationAction(id, actionId) {
  return executeAction(id, actionId)
}

async function markRead(id) {
  const target = findNotification(id)
  if (!target || target.is_read) return
  try {
    const resp = await notificationsApi.markRead(id)
    const data = resp?.data ?? resp
    if (data?.success || resp?.success) {
      const readAt = new Date().toISOString()
      const inItems = items.value.find((n) => n.id === id)
      const inSidebar = sidebarItems.value.find((n) => n.id === id)
      if (inItems) applyReadState(inItems, readAt)
      if (inSidebar) applyReadState(inSidebar, readAt)
      if (typeof data?.unread_count === 'number') {
        unreadCount.value = data.unread_count
      } else if (unreadCount.value > 0) {
        unreadCount.value -= 1
      }
    }
  } catch { /* отображение ошибки — на стороне UI при необходимости */ }
}

async function markAllRead(options = {}) {
  try {
    const payload = {}
    if (options.source_module) payload.source_module = options.source_module
    const resp = await notificationsApi.markAllRead(payload)
    const data = resp?.data ?? resp
    if (data?.success || resp?.success) {
      const now = new Date().toISOString()
      const source = options.source_module || ''
      const markList = (list) => {
        list.forEach((n) => {
          if (n.is_read) return
          if (source && n.source_module !== source) return
          applyReadState(n, now)
        })
      }
      markList(items.value)
      markList(sidebarItems.value)
      if (typeof data?.unread_count === 'number') {
        unreadCount.value = data.unread_count
      } else if (!source) {
        unreadCount.value = 0
      }
    }
  } catch { /* игнор */ }
}

async function archive(id) {
  try {
    const resp = await notificationsApi.archive(id)
    const data = resp?.data ?? resp
    if (data?.success || resp?.success) {
      syncUnreadFromResponse(data)
      if (!listArchived.value) {
        removeFromLists(id)
      } else if (data.notification) {
        applyNotificationUpdate(data.notification)
      }
      return true
    }
  } catch (e) {
    logError('archive notification:', e)
  }
  return false
}

async function unarchive(id) {
  try {
    const resp = await notificationsApi.unarchive(id)
    const data = resp?.data ?? resp
    if (data?.success || resp?.success) {
      syncUnreadFromResponse(data)
      if (listArchived.value) {
        removeFromLists(id)
      } else if (data.notification) {
        applyNotificationUpdate(data.notification)
      }
      return true
    }
  } catch (e) {
    logError('unarchive notification:', e)
  }
  return false
}

async function hideFromSidebar(id) {
  try {
    const resp = await notificationsApi.hideFromSidebar(id)
    const data = resp?.data ?? resp
    if (data?.success || resp?.success) {
      syncUnreadFromResponse(data)
      sidebarItems.value = sidebarItems.value.filter((n) => n.id !== id)
      if (data.notification) applyNotificationUpdate(data.notification)
      return true
    }
  } catch (e) {
    logError('hideFromSidebar:', e)
  }
  return false
}

async function softDelete(id) {
  try {
    const resp = await notificationsApi.softDelete(id)
    const data = resp?.data ?? resp
    if (data?.success || resp?.success) {
      syncUnreadFromResponse(data)
      removeFromLists(id)
      return true
    }
  } catch (e) {
    logError('softDelete notification:', e)
  }
  return false
}

const TOAST_METHOD_BY_LEVEL = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
}

function showIncomingToast(notification) {
  try {
    const toast = useToast()
    const method = TOAST_METHOD_BY_LEVEL[notification.level] || 'info'
    toast[method](notification.title, { timeout: 6000 })
  } catch { /* toast — best effort, инбокс уже обновлён */ }
}

function handleSocketMessage(_event, data) {
  if (!isRealtimeEnvelope(data)) {
    return
  }
  if (data.type === 'notification_new' || data.type === 'notification_updated') {
    applyIncomingNotification(data.payload)
  }
}

function applyIncomingNotification(notification) {
  if (!notification?.id) {
    return
  }
  if (notification.deleted_at) {
    removeFromLists(notification.id)
    return
  }
  const existsInItems = items.value.find((n) => n.id === notification.id)
  if (existsInItems) {
    const wasUnread = !existsInItems.is_read
    Object.assign(existsInItems, notification)
    if (wasUnread && notification.is_read && unreadCount.value > 0) {
      unreadCount.value -= 1
    }
    if (notification.archived_at && !listArchived.value) {
      items.value = items.value.filter((n) => n.id !== notification.id)
    }
  } else if (!notification.archived_at && !listArchived.value) {
    items.value.unshift(notification)
    if (!notification.is_read) unreadCount.value += 1
    showIncomingToast(notification)
  } else if (notification.archived_at && listArchived.value) {
    items.value.unshift(notification)
  }

  const existsInSidebar = sidebarItems.value.find((n) => n.id === notification.id)
  if (existsInSidebar) {
    if (!matchesSidebarFilter(notification)) {
      sidebarItems.value = sidebarItems.value.filter((n) => n.id !== notification.id)
    } else {
      Object.assign(existsInSidebar, notification)
    }
  } else if (matchesSidebarFilter(notification)) {
    sidebarItems.value.unshift(notification)
    if (sidebarItems.value.length > SIDEBAR_PAGE_SIZE) {
      sidebarItems.value = sidebarItems.value.slice(0, SIDEBAR_PAGE_SIZE)
    }
  }
  wsConnection?.setLastNotificationId?.(notification.id)
}

function disconnect() {
  intentionalClose = true
  wsConnection?.close()
  wsConnection = null
  connected.value = false
}

async function ensureInitialized(options = {}) {
  if (initialized) return
  initialized = true
  if (!options.skipLoad) {
    await loadInitial()
  } else {
    try {
      const countResp = await notificationsApi.unreadCount()
      unreadCount.value = Number(countResp?.data?.count ?? 0)
    } catch {
      unreadCount.value = 0
    }
  }
  openSocket()
}

function reset() {
  disconnect()
  items.value = []
  sidebarItems.value = []
  unreadCount.value = 0
  hasMore.value = false
  listTotal.value = 0
  sourceModules.value = []
  initialized = false
}

export function useNotificationsInbox() {
  return {
    items,
    sidebarItems,
    unreadCount,
    loading,
    loadingMore,
    sidebarLoading,
    connected,
    hasMore,
    listTotal,
    sourceModules,
    listArchived,
    hasUnread: computed(() => unreadCount.value > 0),
    ensureInitialized,
    loadInitial,
    loadMore,
    loadSidebar,
    markRead,
    markAllRead,
    archive,
    unarchive,
    hideFromSidebar,
    softDelete,
    executeAction,
    disconnect,
    reset,
  }
}
