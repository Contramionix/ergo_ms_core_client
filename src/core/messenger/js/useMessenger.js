import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/core/cms/js/userStore'
import { messengerApi } from './messenger-api'
import { useWebSocket } from './useWebSocket'
import { isHttpPollingMode, isWebSocketMode, pollIntervalMs } from '@/js/realtime/config.js'
import { buildClientEnvelope } from '@/js/realtime/envelope.js'
import { messengerTopic } from '@/js/realtime/RealtimeClient.js'
import { registerPollJob } from '@/js/realtime/pollCoordinator.js'

const SEND_ACK_TIMEOUT_MS = 10000

export function useMessenger(contentType, objectId) {
  const messages = ref([])
  const loading = ref(false)
  const sending = ref(false)
  const userStore = useUserStore()
  const { connected, connect, disconnect, send } = useWebSocket()

  let pollUnregister = null
  const pendingSends = new Map()

  function pollInterval() {
    return pollIntervalMs('messenger')
  }

  async function pollIncremental() {
    if (document.visibilityState === 'hidden') {
      return
    }
    await loadMessages(true, { silent: true })
  }

  function pollJobId() {
    return `messenger-messages:${contentType.value}:${objectId.value}`
  }

  function startPolling() {
    stopPolling()
    if (!isHttpPollingMode()) {
      return
    }
    if (!contentType.value || !objectId.value) {
      return
    }
    pollUnregister = registerPollJob(pollJobId(), pollIncremental, pollInterval())
  }

  function stopPolling() {
    pollUnregister?.()
    pollUnregister = null
  }

  function handleConnectionChange(isConnected) {
    if (isHttpPollingMode()) {
      startPolling()
      return
    }
    if (isConnected) {
      stopPolling()
    }
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

  function upsertMessage(message) {
    if (!message?.id) {
      return
    }
    const idx = messages.value.findIndex((m) => m.id === message.id)
    if (idx === -1) {
      messages.value.push(message)
    } else {
      messages.value.splice(idx, 1, message)
    }
  }

  function settlePendingSend(requestId, error, message) {
    const pending = pendingSends.get(requestId)
    if (!pending) {
      return
    }
    clearTimeout(pending.timer)
    pendingSends.delete(requestId)
    if (error) {
      pending.reject(error)
    } else {
      pending.resolve(message)
    }
  }

  function waitForSendAck(requestId) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingSends.delete(requestId)
        reject(new Error('timeout'))
      }, SEND_ACK_TIMEOUT_MS)
      pendingSends.set(requestId, { resolve, reject, timer })
    })
  }

  function clearPendingSends() {
    for (const pending of pendingSends.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('unmounted'))
    }
    pendingSends.clear()
  }

  function canMutateViaSocket() {
    return isWebSocketMode() && connected.value
  }

  function topic() {
    return messengerTopic(contentType.value, objectId.value)
  }

  async function sendCommand(type, payload) {
    const envelope = buildClientEnvelope(type, payload, topic())
    const ackPromise = waitForSendAck(envelope.id)
    send(envelope)
    return ackPromise
  }

  async function sendMessageViaRest(text, replyToId) {
    const response = await messengerApi.sendMessage(
      contentType.value, objectId.value, text, replyToId,
    )
    upsertMessage(response.data)
  }

  async function sendMessageViaSocket(text, replyToId) {
    const payload = { text }
    if (replyToId) {
      payload.reply_to = replyToId
    }
    const newMsg = await sendCommand('send_message', payload)
    upsertMessage(newMsg)
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
      } else if (canMutateViaSocket()) {
        try {
          await sendMessageViaSocket(text, replyToId)
        } catch {
          await loadMessages(true, { silent: true })
        }
      } else {
        await sendMessageViaRest(text, replyToId)
      }
    } finally {
      sending.value = false
    }
  }

  function removeMessageById(messageId) {
    messages.value = messages.value.filter((m) => m.id !== messageId)
  }

  async function deleteMessageViaRest(messageId) {
    await messengerApi.deleteMessage(messageId)
    removeMessageById(messageId)
  }

  async function deleteMessageViaSocket(messageId) {
    const deletedId = await sendCommand('delete_message', { id: messageId })
    removeMessageById(deletedId ?? messageId)
  }

  async function deleteMessage(messageId) {
    try {
      if (canMutateViaSocket()) {
        try {
          await deleteMessageViaSocket(messageId)
        } catch {
          await loadMessages(true, { silent: true })
        }
      } else {
        await deleteMessageViaRest(messageId)
      }
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

  async function editMessageViaRest(messageId, text) {
    const response = await messengerApi.editMessage(messageId, text)
    upsertMessage(response.data)
    return response.data
  }

  async function editMessageViaSocket(messageId, text) {
    const updated = await sendCommand('edit_message', { id: messageId, text })
    upsertMessage(updated)
    return updated
  }

  async function editMessage(messageId, text, attachmentIdsToRemove = [], newFiles = []) {
    const hasAttachmentChanges = (
      (attachmentIdsToRemove && attachmentIdsToRemove.length > 0)
      || (newFiles && newFiles.length > 0)
    )
    try {
      if (hasAttachmentChanges) {
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
          upsertMessage(updated)
        }
        return
      }
      if (canMutateViaSocket()) {
        try {
          await editMessageViaSocket(messageId, text)
        } catch {
          await loadMessages(true, { silent: true })
        }
        return
      }
      await editMessageViaRest(messageId, text)
    } catch { /* ошибка обрабатывается в UI */ }
  }

  function handleWsMessage(data) {
    if (!data?.type || !('payload' in data)) {
      return
    }
    const { type, payload } = data
    if (type === 'send_message_ok') {
      upsertMessage(payload?.message)
      settlePendingSend(payload?.request_id, null, payload?.message)
      return
    }
    if (type === 'edit_message_ok') {
      upsertMessage(payload?.message)
      settlePendingSend(payload?.request_id, null, payload?.message)
      return
    }
    if (type === 'delete_message_ok') {
      removeMessageById(payload?.message_id)
      settlePendingSend(payload?.request_id, null, payload?.message_id)
      return
    }
    if (
      type === 'send_message_error'
      || type === 'edit_message_error'
      || type === 'delete_message_error'
    ) {
      settlePendingSend(payload?.request_id, new Error(payload?.detail || 'send_failed'))
      return
    }
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
    startPolling()
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
    clearPendingSends()
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
