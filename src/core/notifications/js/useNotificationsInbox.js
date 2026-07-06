import { ref, computed } from 'vue'
import { useToast } from '@/js/utils/toast.js'
import tokenService from '@/core/cms/js/tokenService'
import { connectNotificationsTransport } from '@/js/realtime/notificationsTransport.js'
import { isHttpPollingMode, isSseMode } from '@/js/realtime/config.js'
import { isRealtimeEnvelope } from '@/js/realtime/envelope.js'
import { notificationsApi } from './notifications-api'

const SIDEBAR_WEEK_MS = 7 * 24 * 60 * 60 * 1000

const items = ref([])
const sidebarItems = ref([])
const unreadCount = ref(0)
const loading = ref(false)
const sidebarLoading = ref(false)
const connected = ref(false)

let wsConnection = null
let intentionalClose = false
let initialized = false

export function matchesSidebarFilter(notification) {
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

async function loadInitial() {
  if (loading.value) return
  loading.value = true
  try {
    const [listResp, countResp] = await Promise.all([
      notificationsApi.list({ page_size: 50 }),
      notificationsApi.unreadCount(),
    ])
    const list = listResp?.data?.results ?? listResp?.data ?? []
    items.value = Array.isArray(list) ? list : []
    unreadCount.value = Number(countResp?.data?.count ?? 0)
    syncPollingCursorFromItems()
  } catch {
    items.value = []
    unreadCount.value = 0
  } finally {
    loading.value = false
  }
}

async function loadSidebar() {
  if (sidebarLoading.value) return
  sidebarLoading.value = true
  try {
    const listResp = await notificationsApi.list({ page_size: 50, inbox: 'sidebar' })
    const list = listResp?.data?.results ?? listResp?.data ?? []
    sidebarItems.value = Array.isArray(list) ? list : []
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
      if (typeof data.unread_count === 'number') {
        unreadCount.value = data.unread_count
      }
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
    if (resp?.success) {
      const readAt = new Date().toISOString()
      const inItems = items.value.find((n) => n.id === id)
      const inSidebar = sidebarItems.value.find((n) => n.id === id)
      if (inItems) applyReadState(inItems, readAt)
      if (inSidebar) applyReadState(inSidebar, readAt)
      if (typeof resp.data?.unread_count === 'number') {
        unreadCount.value = resp.data.unread_count
      } else if (unreadCount.value > 0) {
        unreadCount.value -= 1
      }
    }
  } catch { /* отображение ошибки — на стороне UI при необходимости */ }
}

async function markAllRead() {
  try {
    const resp = await notificationsApi.markAllRead()
    if (resp?.success) {
      const now = new Date().toISOString()
      const markList = (list) => {
        list.forEach((n) => {
          if (!n.is_read) applyReadState(n, now)
        })
      }
      markList(items.value)
      markList(sidebarItems.value)
      unreadCount.value = 0
    }
  } catch { /* игнор */ }
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
  const existsInItems = items.value.find((n) => n.id === notification.id)
  if (existsInItems) {
    const wasUnread = !existsInItems.is_read
    Object.assign(existsInItems, notification)
    if (wasUnread && notification.is_read && unreadCount.value > 0) {
      unreadCount.value -= 1
    }
  } else {
    items.value.unshift(notification)
    if (!notification.is_read) unreadCount.value += 1
    showIncomingToast(notification)
  }
  const existsInSidebar = sidebarItems.value.find((n) => n.id === notification.id)
  if (existsInSidebar) {
    Object.assign(existsInSidebar, notification)
  } else if (matchesSidebarFilter(notification)) {
    sidebarItems.value.unshift(notification)
  }
  wsConnection?.setLastNotificationId?.(notification.id)
}

function disconnect() {
  intentionalClose = true
  wsConnection?.close()
  wsConnection = null
  connected.value = false
}

async function ensureInitialized() {
  if (initialized) return
  initialized = true
  await loadInitial()
  openSocket()
}

function reset() {
  disconnect()
  items.value = []
  sidebarItems.value = []
  unreadCount.value = 0
  initialized = false
}

export function useNotificationsInbox() {
  return {
    items,
    sidebarItems,
    unreadCount,
    loading,
    sidebarLoading,
    connected,
    hasUnread: computed(() => unreadCount.value > 0),
    ensureInitialized,
    loadInitial,
    loadSidebar,
    markRead,
    markAllRead,
    executeAction,
    disconnect,
    reset,
  }
}
