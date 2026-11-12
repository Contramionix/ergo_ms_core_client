/**
 * Один SSE на все вкладки сайта.
 * HTTP/1.1 даёт шесть соединений на адрес; поток /api/realtime/stream/ соединение не отпускает.
 * Лидер держит поток и раздаёт события, остальные вкладки только слушают.
 */

const LOCK_NAME = 'ergo-realtime-sse'
const CHANNEL_NAME = 'ergo-realtime-sse'

/**
 * @param {{
 *   onBecomeLeader?: (tools: { publish: (envelope: object) => void, announce: () => void }) => void,
 *   onBecomeFollower?: () => void,
 *   onEvent?: (envelope: object) => void,
 *   onLeaderUp?: () => void,
 *   onRelease?: () => void,
 * }} hooks
 * @returns {{ stop: () => void }}
 */
export function startSseTabSession(hooks) {
  const channel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel(CHANNEL_NAME)
    : null
  let released = false
  let leader = false
  /** @type {(() => void)|null} */
  let resolveHold = null

  function publish(envelope) {
    if (!envelope) {
      return
    }
    channel?.postMessage({ type: 'event', envelope })
  }

  function announce() {
    channel?.postMessage({ type: 'leader-up' })
  }

  function onChannelMessage(event) {
    const data = event.data
    if (!data || leader) {
      return
    }
    if (data.type === 'event') {
      hooks.onEvent?.(data.envelope)
    } else if (data.type === 'leader-up') {
      hooks.onLeaderUp?.()
    }
  }

  channel?.addEventListener('message', onChannelMessage)

  function hold() {
    return new Promise((resolve) => {
      resolveHold = resolve
    })
  }

  function stop() {
    if (released) {
      return
    }
    released = true
    resolveHold?.()
    channel?.removeEventListener('message', onChannelMessage)
    channel?.close()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', stop, { once: true })
  }

  async function acquire() {
    if (!navigator.locks?.request) {
      leader = true
      hooks.onBecomeLeader?.({ publish, announce })
      return
    }

    hooks.onBecomeFollower?.()
    try {
      await navigator.locks.request(LOCK_NAME, async () => {
        if (released) {
          return
        }
        leader = true
        try {
          hooks.onBecomeLeader?.({ publish, announce })
        } catch {
          // Замок всё равно держим: иначе вторая вкладка откроет свой поток.
        }
        await hold()
        leader = false
        hooks.onRelease?.()
      })
    } catch {
      if (!released && !leader) {
        leader = true
        hooks.onBecomeLeader?.({ publish, announce })
      }
    }
  }

  void acquire()

  return { stop }
}
