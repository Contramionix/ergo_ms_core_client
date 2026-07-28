import { CLIENT_MONITOR_ENDPOINT } from './transport.js'
import {
  enqueueMonitorEvent,
  flushMonitorBuffer,
  flushMonitorBufferSyncKeepalive,
  installMonitorBufferLifecycle,
} from './buffer.js'

import { isMonitoringEnabled, resetMonitorSession } from './session.js'

let routerHookInstalled = false
let axiosHookInstalled = false
let errorHookInstalled = false
/** @type {import('vue-router').Router|null} */
let boundRouter = null

function safePath(url) {
  if (!url || typeof url !== 'string') {
    return ''
  }
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return new URL(url).pathname
    }
  } catch {
    /* ignore */
  }
  return url.split('?')[0]
}

function shouldSkipApiUrl(url) {
  const path = String(url || '')
  return (
    path.includes('client-monitor')
    || path.includes('client-log')
    || path.includes(CLIENT_MONITOR_ENDPOINT)
  )
}

export function trackMonitorNav(to, from) {
  if (!isMonitoringEnabled()) {
    return
  }
  enqueueMonitorEvent('nav', {
    path: to?.fullPath || to?.path || '',
    route_name: typeof to?.name === 'string' ? to.name : '',
    from: from?.fullPath || from?.path || '',
  })
}

export function trackMonitorApi({ method, url, status, durationMs, requestId }) {
  if (!isMonitoringEnabled()) {
    return
  }
  if (shouldSkipApiUrl(url)) {
    return
  }
  enqueueMonitorEvent('api', {
    method: String(method || 'GET').toUpperCase(),
    path: safePath(url),
    status: typeof status === 'number' ? status : undefined,
    duration_ms: typeof durationMs === 'number' ? Math.max(0, Math.round(durationMs)) : undefined,
    request_id: requestId ? String(requestId).slice(0, 64) : undefined,
  })
}

export function trackMonitorError(message, extra = {}) {
  if (!isMonitoringEnabled()) {
    return
  }
  enqueueMonitorEvent('error', {
    message: typeof message === 'string' ? message.slice(0, 500) : 'error',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ...extra,
  })
  // Ошибки важнее — быстрее отправить
  void flushMonitorBuffer()
}

export function trackMonitorWarn(message, extra = {}) {
  if (!isMonitoringEnabled()) {
    return
  }
  enqueueMonitorEvent('warn', {
    message: typeof message === 'string' ? message.slice(0, 500) : 'warn',
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ...extra,
  })
}

export function trackMonitorLifecycle(event, extra = {}) {
  if (!isMonitoringEnabled()) {
    return
  }
  enqueueMonitorEvent('lifecycle', {
    event: String(event || ''),
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ...extra,
  })
}

export function installRouterMonitor(router) {
  if (!isMonitoringEnabled() || !router || routerHookInstalled) {
    return
  }
  routerHookInstalled = true
  boundRouter = router
  router.afterEach((to, from) => {
    trackMonitorNav(to, from)
  })
}

export function installAxiosMonitor(axiosInstance) {
  if (!isMonitoringEnabled() || !axiosInstance || axiosHookInstalled) {
    return
  }
  axiosHookInstalled = true

  axiosInstance.interceptors.request.use((config) => {
    config.__monitorStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
    return config
  })

  axiosInstance.interceptors.response.use(
    (response) => {
      const config = response.config || {}
      const started = config.__monitorStartedAt
      const durationMs =
        started != null
          ? (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started
          : undefined
      const requestId =
        response.headers?.['x-request-id']
        || response.headers?.['X-Request-ID']
        || config.headers?.['X-Request-ID']
      trackMonitorApi({
        method: config.method,
        url: config.url,
        status: response.status,
        durationMs,
        requestId,
      })
      return response
    },
    (error) => {
      const config = error?.config || {}
      if (shouldSkipApiUrl(config.url)) {
        return Promise.reject(error)
      }
      const started = config.__monitorStartedAt
      const durationMs =
        started != null
          ? (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started
          : undefined
      const requestId =
        error.response?.headers?.['x-request-id']
        || error.response?.headers?.['X-Request-ID']
      trackMonitorApi({
        method: config.method,
        url: config.url,
        status: error.response?.status,
        durationMs,
        requestId,
      })
      return Promise.reject(error)
    },
  )
}

export function installGlobalErrorMonitor(app) {
  if (!isMonitoringEnabled() || errorHookInstalled) {
    return
  }
  errorHookInstalled = true

  if (app && typeof app === 'object') {
    const prev = app.config.errorHandler
    app.config.errorHandler = (err, instance, info) => {
      const message =
        (err && typeof err.message === 'string' && err.message)
        || String(err || 'Vue error')
      trackMonitorError(message.slice(0, 500), {
        component: info ? String(info).slice(0, 200) : undefined,
        stack: err?.stack ? String(err.stack).slice(0, 2000) : undefined,
      })
      if (typeof prev === 'function') {
        prev(err, instance, info)
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason
      const message =
        (reason && typeof reason.message === 'string' && reason.message)
        || String(reason || 'unhandledrejection')
      trackMonitorError(message.slice(0, 500), {
        component: 'unhandledrejection',
        stack: reason?.stack ? String(reason.stack).slice(0, 2000) : undefined,
      })
    })
  }
}

export function onMonitorLogout() {
  if (isMonitoringEnabled()) {
    trackMonitorLifecycle('logout')
    flushMonitorBufferSyncKeepalive()
  }
  resetMonitorSession()
}


export function initClientMonitor({ app, router, axiosInstance } = {}) {
  if (!isMonitoringEnabled()) {
    return
  }
  installMonitorBufferLifecycle()
  if (router) {
    installRouterMonitor(router)
  } else if (boundRouter) {
    installRouterMonitor(boundRouter)
  }
  if (axiosInstance) {
    installAxiosMonitor(axiosInstance)
  }
  if (app) {
    installGlobalErrorMonitor(app)
  }
  trackMonitorLifecycle('boot')
}
