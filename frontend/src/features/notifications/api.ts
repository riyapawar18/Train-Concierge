import { api } from '@/lib/apiClient'
import type {
  AppNotification,
  NotificationFilter,
  NotificationPage,
  NotificationPreferences,
  UnreadCount,
} from './types'

export interface NotificationQuery {
  filter?: NotificationFilter
  page?: number
  size?: number
}

export function getNotifications(query: NotificationQuery = {}): Promise<NotificationPage> {
  const params: Record<string, string | number> = {}
  if (query.filter && query.filter !== 'ALL') {
    params.filter = query.filter
  }
  if (query.page !== undefined) {
    params.page = query.page
  }
  if (query.size !== undefined) {
    params.size = query.size
  }
  return api.get<NotificationPage>('/notifications', { params })
}

export function getUnreadCount(): Promise<UnreadCount> {
  return api.get<UnreadCount>('/notifications/unread-count')
}

export function markNotificationRead(id: number): Promise<AppNotification> {
  return api.patch<AppNotification>(`/notifications/${id}/read`)
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return api.post<{ updated: number }>('/notifications/read-all')
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return api.get<NotificationPreferences>('/settings/preferences')
}

export function updateNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  return api.put<NotificationPreferences>('/settings/preferences', preferences)
}
