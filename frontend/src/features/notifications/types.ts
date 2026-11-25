import type { DisruptionSeverity, DisruptionType } from '@/features/disruptions/types'

export type NotificationType =
  | 'DISRUPTION'
  | 'DISRUPTION_UPDATED'
  | 'DISRUPTION_RESOLVED'
  | 'SEAT_ALERT'
  | 'BOOKING_CONFIRMED'
  | 'REBOOKING_CONFIRMED'
  | 'HOTEL_AT_RISK'
  | 'HOTEL_UPDATE'
  | 'PAYMENT'
  | 'SYSTEM'
  | 'ANNOUNCEMENT'

export type NotificationFilter = 'ALL' | 'UNREAD' | 'DISRUPTIONS' | 'SEATS' | 'BOOKINGS'

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  body: string
  linkPath: string | null
  entityType: string | null
  entityId: number | null
  read: boolean
  createdAt: string
}

export interface NotificationPage {
  items: AppNotification[]
  page: number
  size: number
  total: number
  hasMore: boolean
}

export interface UnreadCount {
  count: number
}

export interface NotificationPreferences {
  emailEnabled: boolean
  seatAlertsEnabled: boolean
  disruptionAlertsEnabled: boolean
  announcementsEnabled: boolean
}

export interface NotificationStreamEvent {
  id: number
  type: NotificationType
  title: string
  body: string
  linkPath: string | null
  createdAt: string
  unreadCount: number
}

export interface SeatUpdateStreamEvent {
  trainNumber: string
  travelDate: string
  classCode: string
  seatsAvailable: number
}

export interface DisruptionPrompt {
  key: string
  disruptionId: number
  journeyId: number
  notificationId: number | null
  type: DisruptionType
  severity: DisruptionSeverity
  title: string
  body: string
  trainNumber: string
  trainName: string
  delayMinutes: number | null
  newArrival: string | null
  linkPath: string
  active: boolean
}
