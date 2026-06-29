import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import tokenService from '@/core/cms/js/tokenService'
import { buildWebSocketUrl } from '@/js/api/baseUrl.js'
import { notificationsApi } from './notifications-api'

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]
const MAX_RECONNECT_ATTEMPTS = 10
const SIDEBAR_WEEK_MS = 7 * 24 * 60 * 60 * 1000

const items = ref([])
const sidebarItems = ref([])
const unreadCount = ref(0)
const loading = ref(false)
const sidebarLoading = ref(false)
const connected = ref(false)

let socket = null
let reconnectTimer = null
let reconnectAttempt = 0
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

function buildWsUrl() {
  const token = tokenService.getAccess()
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return buildWebSocketUrl(`/ws/notifications/${query}`)
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
    if (data?.success && data.notification) {
      applyNotificationUpdate(data.notification)
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

function handleSocketMessage(event) {
  let data
  try { data = JSON.parse(event.data) } catch { return }

  if (data.type === 'notification_new' && data.notification) {
    const { notification } = data
    const existsInItems = items.value.find((n) => n.id === notification.id)
    if (!existsInItems) {
      items.value.unshift(notification)
      if (!notification.is_read) unreadCount.value += 1
      showIncomingToast(notification)
    }
    const existsInSidebar = sidebarItems.value.find((n) => n.id === notification.id)
    if (!existsInSidebar && matchesSidebarFilter(notification)) {
      sidebarItems.value.unshift(notification)
    }
  }
}

function openSocket() {
  if (!tokenService.getAccess()) return
  try {
    intentionalClose = false
    socket = new WebSocket(buildWsUrl())
    const openedAt = Date.now()

    socket.onopen = () => {
      connected.value = true
      reconnectAttempt = 0
    }
    socket.onmessage = handleSocketMessage
    socket.onclose = () => {
      connected.value = false
      socket = null
      const elapsed = Date.now() - openedAt
      if (!intentionalClose && elapsed > 500) scheduleReconnect()
    }
    socket.onerror = () => {
      connected.value = false
    }
  } catch {
    connected.value = false
  }
}

function scheduleReconnect() {
  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) return
  if (reconnectTimer) clearTimeout(reconnectTimer)
  const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)]
  reconnectAttempt++
  reconnectTimer = setTimeout(openSocket, delay)
}

function disconnect() {
  intentionalClose = true
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (socket) {
    try { socket.close() } catch { /* ignore */ }
    socket = null
  }
  connected.value = false
  reconnectAttempt = 0
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
