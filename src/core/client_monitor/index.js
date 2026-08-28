export { isMonitoringEnabled, resetMonitorSession } from './session.js'
export { loadCollector } from './loadCollector.js'

export function initClientMonitor(options) {
  return loadCollector().then(({ initClientMonitor: init }) => init(options))
}
