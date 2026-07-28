export const clientMonitorEndpoints = {
  clientMonitor: {
    sessions: 'client_monitor/sessions/',
    session: (publicId) => `client_monitor/sessions/${publicId}/`,
    events: (publicId) => `client_monitor/sessions/${publicId}/events/`,
    intervals: (publicId) => `client_monitor/sessions/${publicId}/intervals/`,
    debugPack: (publicId) => `client_monitor/sessions/${publicId}/debug-pack/`,
  },
}
