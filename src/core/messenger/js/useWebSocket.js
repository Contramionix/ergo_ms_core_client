import { ref, onUnmounted } from 'vue'
import { createWebSocketTransport } from '@/js/realtime/transports/websocket.js'
import { getRealtimeClient, messengerTopic } from '@/js/realtime/RealtimeClient.js'
import { isHttpPollingMode, isSseMode } from '@/js/realtime/config.js'

export function useWebSocket() {
  const connected = ref(false)

  let wsConnection = null
  let sseUnsubscribers = []
  let currentContentType = null
  let currentObjectId = null
  let messageHandler = null
  let intentionalClose = false

  function connect(contentType, objectId, onMessage) {
    disconnect()
    messageHandler = onMessage
    currentContentType = contentType
    currentObjectId = objectId

    if (isHttpPollingMode() || isSseMode()) {
      if (isSseMode()) {
        setupSse(contentType, objectId)
      } else {
        connected.value = false
      }
      return
    }

    intentionalClose = false
    const path = `/ws/messenger/${contentType}/${objectId}/`
    wsConnection = createWebSocketTransport(path, {
      onAuthenticated: () => {
        connected.value = true
      },
      onMessage: (_event, data) => {
        messageHandler?.(data)
      },
      onClose: (_event, wasIntentional) => {
        connected.value = false
        if (wasIntentional) {
          wsConnection = null
        }
      },
      onError: () => {
        connected.value = false
      },
    })
  }

  function setupSse(contentType, objectId) {
    const client = getRealtimeClient()
    const topic = messengerTopic(contentType, objectId)
    void client.subscribe(topic)
    client.ensureConnected({
      onAuthenticated: () => {
        connected.value = true
      },
      onClose: () => {
        connected.value = false
      },
    })

    const eventTypes = ['new_message', 'message_edited', 'message_deleted', 'typing_indicator']
    for (const eventType of eventTypes) {
      const off = client.on(eventType, (_event, data) => {
        messageHandler?.(data)
      })
      sseUnsubscribers.push(off)
    }
  }

  function send(data) {
    if (isHttpPollingMode() || isSseMode()) {
      return
    }
    const socket = wsConnection?.getSocket?.()
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data))
    }
  }

  async function disconnect() {
    intentionalClose = true
    if (isSseMode() && currentContentType && currentObjectId) {
      const client = getRealtimeClient()
      await client.unsubscribe(messengerTopic(currentContentType, currentObjectId))
    }
    for (const off of sseUnsubscribers) {
      off?.()
    }
    sseUnsubscribers = []
    wsConnection?.close?.()
    wsConnection = null
    connected.value = false
    currentContentType = null
    currentObjectId = null
    intentionalClose = false
  }

  onUnmounted(disconnect)

  return { connected, connect, disconnect, send }
}
