import tokenService from '@/core/cms/js/tokenService'
import { buildRealtimeStreamUrl } from '@/js/realtime/realtimeApi.js'
import { isRealtimeEnvelope } from '@/js/realtime/envelope.js'
import { MAX_RECONNECT_ATTEMPTS, reconnectDelayMs } from '@/js/realtime/reconnect.js'

export function createSseTransport(handlers = {}) {
  let abortController = null
  let reconnectTimer = null
  let reconnectAttempt = 0
  let intentionalClose = false
  let authenticated = false
  let reader = null
  let connecting = false

  async function connect() {
    if (intentionalClose || connecting) {
      return
    }

    const token = tokenService.getAccess()
    if (!token) {
      scheduleReconnect()
      return
    }

    connecting = true
    abortController?.abort()
    abortController = new AbortController()
    authenticated = false

    const url = buildRealtimeStreamUrl()
    let streamEnded = false

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: abortController.signal,
      })

      if (!response.ok || !response.body) {
        handlers.onError?.()
        scheduleReconnect()
        return
      }

      authenticated = true
      reconnectAttempt = 0
      handlers.onAuthenticated?.()

      reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!intentionalClose) {
        const { done, value } = await reader.read()
        if (done) {
          streamEnded = true
          break
        }
        buffer += decoder.decode(value, { stream: true })
        buffer = processBuffer(buffer, handlers)
      }
    } catch (error) {
      if (intentionalClose || error?.name === 'AbortError') {
        return
      }
      authenticated = false
      handlers.onError?.()
      scheduleReconnect()
    } finally {
      connecting = false
      reader = null
      if (!intentionalClose && streamEnded) {
        authenticated = false
        handlers.onClose?.({}, false)
        scheduleReconnect()
      }
    }
  }

  function processBuffer(buffer, h) {
    const parts = buffer.split('\n\n')
    const remainder = parts.pop() || ''
    for (const block of parts) {
      const lines = block.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data:')) {
          continue
        }
        const raw = line.slice(5).trim()
        if (!raw) {
          continue
        }
        try {
          const parsed = JSON.parse(raw)
          if (isRealtimeEnvelope(parsed)) {
            h.onMessage?.(null, parsed)
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }
    return remainder
  }

  function scheduleReconnect() {
    if (intentionalClose || connecting || reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      return
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }
    const delay = reconnectDelayMs(reconnectAttempt)
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void connect()
    }, delay)
  }

  void connect()

  return {
    close() {
      intentionalClose = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      abortController?.abort()
      abortController = null
      authenticated = false
      handlers.onClose?.({}, true)
    },
    reconnect() {
      intentionalClose = false
      reconnectAttempt = 0
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      void connect()
    },
    getSocket() {
      return null
    },
    isAuthenticated() {
      return authenticated
    },
  }
}
