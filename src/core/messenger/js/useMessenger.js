import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore'
import { messengerApi } from './messenger-api'
import { useWebSocket } from './useWebSocket'
import { isHttpPollingMode, isPushTransport, pollIntervalMs } from '@/js/realtime/config.js'
import { buildClientEnvelope } from '@/js/realtime/envelope.js'
import { messengerTopic } from '@/js/realtime/RealtimeClient.js'
import { registerPollJob } from '@/js/realtime/pollCoordinator.js'

export function useMessenger(contentType, objectId) {
  const messages = ref([])
  const loading = ref(false)
  const sending = ref(false)
  const userStore = useUserStore()
  const { connected, connect, disconnect, send } = useWebSocket()

  let pollUnregister = null

  function pollInterval() {
    return pollIntervalMs('messenger')
  }

  async function pollIncremental() {
    if (document.visibilityState === 'hidden') {
      return
    }
    await loadMessages(true, { silent: true })
  }

  function startPolling() {
    stopPolling()
    if (isHttpPollingMode() || !connected.value) {
      pollUnregister = registerPollJob('messenger-messages', pollIncremental, pollInterval())
    }
  }

  function stopPolling() {
    pollUnregister?.()
    pollUnregister = null
  }

  function handleConnectionChange(isConnected) {
    if (isPushTransport() && isConnected) {
      stopPolling()
      return
    }
    startPolling()
  }

  function lastMessageId() {
    return messages.value.reduce((max, item) => Math.max(max, item?.id ?? 0), 0)
  }

  async function loadMessages(incremental = false, { silent = false } = {}) {
    if (!contentType.value || !objectId.value) return
    if (!incremental && !silent) {
      loading.value = true
    }
    try {
      const afterId = incremental ? lastMessageId() : 0
      const response = await messengerApi.getMessages(contentType.value, objectId.value, afterId)
      const list = response.data?.results ?? response.data ?? []
      const incoming = Array.isArray(list) ? list : []
      if (incremental && afterId > 0) {
        for (const message of incoming) {
          if (!messages.value.find((m) => m.id === message.id)) {
            messages.value.push(message)
          }
        }
      } else {
        messages.value = incoming
      }
    } catch {
      if (!incremental) {
        messages.value = []
      }
    } finally {
      if (!incremental && !silent) {
        loading.value = false
      }
    }
  }

  async function sendMessage(text, files = [], replyToId = null) {
    if (!contentType.value || !objectId.value) return
    if (!text.trim() && files.length === 0) return

    sending.value = true
    try {
      if (files.length > 0) {
        await messengerApi.sendMessageWithAttachments(
          contentType.value, objectId.value, text, files, replyToId,
        )
        await loadMessages()
      } else {
        const response = await messengerApi.sendMessage(
          contentType.value, objectId.value, text, replyToId,
        )
        const newMsg = response.data
        if (!messages.value.find((m) => m.id === newMsg.id)) {
          messages.value.push(newMsg)
        }
      }
    } finally {
      sending.value = false
    }
  }

  async function deleteMessage(messageId) {
    try {
      await messengerApi.deleteMessage(messageId)
      messages.value = messages.value.filter((m) => m.id !== messageId)
    } catch { /* ошибка обрабатывается в UI */ }
  }

  async function deleteAttachment(attachmentId) {
    try {
      await messengerApi.deleteAttachment(attachmentId)
      const msg = messages.value.find((m) => m.attachments?.some((a) => a.id === attachmentId))
      if (msg && msg.attachments) {
        msg.attachments = msg.attachments.filter((a) => a.id !== attachmentId)
      }
    } catch { /* ошибка обрабатывается в UI */ }
  }

  async function editMessage(messageId, text, attachmentIdsToRemove = [], newFiles = []) {
    try {
      for (const id of attachmentIdsToRemove) {
        await messengerApi.deleteAttachment(id)
      }
      const response = await messengerApi.editMessage(messageId, text)
      const updated = response.data
      if (newFiles && newFiles.length > 0) {
        const uploads = newFiles.map((file) => messengerApi.uploadAttachment(messageId, file))
        await Promise.all(uploads)
        const listRes = await messengerApi.getMessages(contentType.value, objectId.value)
        const list = listRes.data?.results ?? listRes.data ?? []
        const fresh = Array.isArray(list) ? list.find((m) => m.id === messageId) : null
        const idx = messages.value.findIndex((m) => m.id === messageId)
        if (idx !== -1) messages.value.splice(idx, 1, fresh || updated)
      } else {
        const idx = messages.value.findIndex((m) => m.id === messageId)
        if (idx !== -1) messages.value.splice(idx, 1, updated)
      }
    } catch { /* ошибка обрабатывается в UI */ }
  }

  function handleWsMessage(data) {
    if (!data?.type || !('payload' in data)) {
      return
    }
    const { type, payload } = data
    if (type === 'new_message') {
      const existing = messages.value.find((m) => m.id === payload.id)
      if (!existing) {
        messages.value.push(payload)
      }
    } else if (type === 'message_edited') {
      const idx = messages.value.findIndex((m) => m.id === payload.id)
      if (idx !== -1) messages.value.splice(idx, 1, payload)
    } else if (type === 'message_deleted') {
      messages.value = messages.value.filter((m) => m.id !== payload)
    } else if (type === 'typing_indicator' && payload?.user_id) {
      // typing только в websocket-режиме (capabilities)
    }
  }

  function sendTyping() {
    const user = userStore.user
    if (user && contentType.value && objectId.value) {
      send(buildClientEnvelope(
        'typing_indicator',
        { user_id: user.id, username: user.username || '' },
        messengerTopic(contentType.value, objectId.value),
      ))
    }
  }

  function connectWs() {
    if (contentType.value && objectId.value) {
      connect(contentType.value, objectId.value, handleWsMessage)
    }
  }

  watch([contentType, objectId], () => {
    loadMessages()
    connectWs()
  })

  watch(connected, (isConnected) => {
    handleConnectionChange(isConnected)
  })

  onMounted(() => {
    loadMessages()
    connectWs()
    startPolling()
  })

  onUnmounted(() => {
    disconnect()
    stopPolling()
  })

  return {
    messages,
    loading,
    sending,
    connected,
    sendMessage,
    deleteMessage,
    deleteAttachment,
    editMessage,
    sendTyping,
    loadMessages,
    currentUserId: () => userStore.user?.id,
  }
}
