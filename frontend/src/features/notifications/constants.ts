import type { LucideIcon } from 'lucide-react'
import {
  Armchair,
  BedDouble,
  Bell,
  CircleCheck,
  CreditCard,
  Megaphone,
  Ticket,
  TriangleAlert,
} from 'lucide-react'
import type { Tone } from '@/features/travel/constants'
import type { NotificationFilter, NotificationType } from './types'

export const NOTIFICATION_FILTERS: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'DISRUPTIONS', label: 'Disruptions' },
  { value: 'SEATS', label: 'Seats' },
  { value: 'BOOKINGS', label: 'Bookings' },
]

interface NotificationMeta {
  label: string
  tone: Tone
  icon: LucideIcon
}

const TYPE_META: Record<NotificationType, NotificationMeta> = {
  DISRUPTION: { label: 'Disruption', tone: 'danger', icon: TriangleAlert },
  DISRUPTION_UPDATED: { label: 'Disruption', tone: 'warning', icon: TriangleAlert },
  DISRUPTION_RESOLVED: { label: 'Resolved', tone: 'success', icon: CircleCheck },
  SEAT_ALERT: { label: 'Seats', tone: 'info', icon: Armchair },
  BOOKING_CONFIRMED: { label: 'Booking', tone: 'success', icon: Ticket },
  REBOOKING_CONFIRMED: { label: 'Rebooking', tone: 'success', icon: Ticket },
  HOTEL_AT_RISK: { label: 'Hotel', tone: 'warning', icon: BedDouble },
  HOTEL_UPDATE: { label: 'Hotel', tone: 'info', icon: BedDouble },
  PAYMENT: { label: 'Payment', tone: 'info', icon: CreditCard },
  SYSTEM: { label: 'Update', tone: 'neutral', icon: Bell },
  ANNOUNCEMENT: { label: 'Announcement', tone: 'neutral', icon: Megaphone },
}

const FALLBACK_META: NotificationMeta = {
  label: 'Update',
  tone: 'neutral',
  icon: Bell,
}

export function notificationMeta(type: NotificationType): NotificationMeta {
  return TYPE_META[type] ?? FALLBACK_META
}

export function notificationTypeLabel(type: NotificationType): string {
  return notificationMeta(type).label
}
