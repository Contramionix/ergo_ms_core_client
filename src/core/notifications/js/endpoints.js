export const notificationsEndpoints = {
  notifications: {
    list: 'notifications/',
    detail: id => `notifications/${id}/`,
    unreadCount: 'notifications/unread_count/',
    sourceModules: 'notifications/source_modules/',
    markRead: id => `notifications/${id}/mark_read/`,
    markAllRead: 'notifications/mark_all_read/',
    archive: id => `notifications/${id}/archive/`,
    unarchive: id => `notifications/${id}/unarchive/`,
    hideFromSidebar: id => `notifications/${id}/hide_from_sidebar/`,
    softDelete: id => `notifications/${id}/delete/`,
    executeAction: id => `notifications/${id}/execute_action/`,
    preferences: 'notifications/preferences/',
  },
}
