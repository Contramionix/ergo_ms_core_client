export const notificationsEndpoints = {
  notifications: {
    list: 'notifications/',
    detail: id => `notifications/${id}/`,
    unreadCount: 'notifications/unread_count/',
    markRead: id => `notifications/${id}/mark_read/`,
    markAllRead: 'notifications/mark_all_read/',
    preferences: 'notifications/preferences/',
  },
}
