import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore'
import { messengerApi } from './messenger-api'
import { useWebSocket } from './useWebSocket'
import { isHttpPollingMode, pollIntervalMs } from '@/js/realtime/config.js'

export function useMessenger(contentType, objectId) {
  const messages = ref([])
  const loading = ref(false)
  const sending = ref(false)
  const userStore = useUserStore()
  const { connected, connect, disconnect, send } = useWebSocket()

  let pollTimer = null

  function pollInterval() {
    return pollIntervalMs('messenger')
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

  function startPolling() {
    stopPolling()
    pollTimer = setInterval(() => {
      if (isHttpPollingMode()) {
        loadMessages(false, { silent: true })
      } else if (!connected.value) {
        loadMessages(true)
      }
    }, pollInterval())
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
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
    if (data.type === 'new_message' && data.message) {
      const existing = messages.value.find((m) => m.id === data.message.id)
      if (!existing) {
        messages.value.push(data.message)
      }
    } else if (data.type === 'message_edited' && data.message) {
      const idx = messages.value.findIndex((m) => m.id === data.message.id)
      if (idx !== -1) messages.value.splice(idx, 1, data.message)
    } else if (data.type === 'message_deleted' && data.message_id) {
      messages.value = messages.value.filter((m) => m.id !== data.message_id)
    }
  }

  function sendTyping() {
    const user = userStore.user
    if (user) {
      send({ type: 'typing', user_id: user.id, username: user.username || '' })
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
