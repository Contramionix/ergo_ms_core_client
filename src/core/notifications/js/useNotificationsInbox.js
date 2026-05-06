import { ref, computed } from 'vue'
import tokenService from '@/core/cms/js/tokenService'
import { notificationsApi } from './notifications-api'

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]
const MAX_RECONNECT_ATTEMPTS = 10

const items = ref([])
const unreadCount = ref(0)
const loading = ref(false)
const connected = ref(false)

let socket = null
let reconnectTimer = null
let reconnectAttempt = 0
let intentionalClose = false
let initialized = false

function buildWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env?.VITE_API_HOST ?? window.location.hostname
  const port = import.meta.env?.VITE_API_PORT ?? (window.location.port || (protocol === 'wss:' ? '443' : '80'))
  const token = tokenService.getAccess()
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${protocol}//${host}:${port}/ws/notifications/${query}`
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

async function markRead(id) {
  const target = items.value.find((n) => n.id === id)
  if (!target || target.is_read) return
  try {
    const resp = await notificationsApi.markRead(id)
    if (resp?.success) {
      target.is_read = true
      target.read_at = new Date().toISOString()
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
      items.value.forEach((n) => {
        if (!n.is_read) {
          n.is_read = true
          n.read_at = now
        }
      })
      unreadCount.value = 0
    }
  } catch { /* игнор */ }
}

function handleSocketMessage(event) {
  let data
  try { data = JSON.parse(event.data) } catch { return }

  if (data.type === 'notification_new' && data.notification) {
    const exists = items.value.find((n) => n.id === data.notification.id)
    if (!exists) {
      items.value.unshift(data.notification)
      if (!data.notification.is_read) unreadCount.value += 1
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
  unreadCount.value = 0
  initialized = false
}

export function useNotificationsInbox() {
  return {
    items,
    unreadCount,
    loading,
    connected,
    hasUnread: computed(() => unreadCount.value > 0),
    ensureInitialized,
    loadInitial,
    markRead,
    markAllRead,
    disconnect,
    reset,
  }
}
