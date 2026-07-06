import { openAuthenticatedWebSocket } from '@/js/ws/authenticatedWebSocket.js'
import { isRealtimeEnvelope } from '@/js/realtime/envelope.js'

export function createWebSocketTransport(path, handlers = {}) {
  const connection = openAuthenticatedWebSocket(path, {
    ...handlers,
    onMessage: (event, data) => {
      if (!isRealtimeEnvelope(data)) {
        return
      }
      handlers.onMessage?.(event, data)
    },
  })
  return connection
}
