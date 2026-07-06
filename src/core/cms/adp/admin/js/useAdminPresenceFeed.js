import { ref } from 'vue'

import tokenService from '@/core/cms/js/tokenService'
import { connectAdminPresenceTransport } from '@/js/realtime/adminPresenceTransport.js'

let wsConnection = null
let intentionalClose = false

const connected = ref(false)

function openSocket() {
  if (!tokenService.getAccess()) {
    return
  }

  if (wsConnection && !intentionalClose) {
    return
  }

  intentionalClose = false
  wsConnection?.close()

  wsConnection = connectAdminPresenceTransport({
    onAuthenticated: () => {
      connected.value = true
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

export function connectAdminPresenceFeed() {
  if (wsConnection?.isAuthenticated()) {
    return
  }
  const socket = wsConnection?.getSocket()
  if (socket?.readyState === WebSocket.CONNECTING) {
    return
  }
  openSocket()
}

export function disconnectAdminPresenceFeed() {
  intentionalClose = true
  wsConnection?.close()
  wsConnection = null
  connected.value = false
}

export function useAdminPresenceFeed() {
  return {
    connected,
    connect: connectAdminPresenceFeed,
    disconnect: disconnectAdminPresenceFeed,
  }
}

export default useAdminPresenceFeed
