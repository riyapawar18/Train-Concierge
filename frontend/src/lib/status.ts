export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface StatusMeta {
  label: string
  tone: StatusTone
}

export const STATUS_META = {
  ON_TIME: { label: 'On time', tone: 'success' },
  DELAYED: { label: 'Delayed', tone: 'warning' },
  DIVERTED: { label: 'Diverted', tone: 'warning' },
  RESCHEDULED: { label: 'Rescheduled', tone: 'info' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  COMPLETED: { label: 'Completed', tone: 'neutral' },
  UPCOMING: { label: 'Upcoming', tone: 'info' },
  ACTIVE: { label: 'Active', tone: 'success' },
  DISRUPTED: { label: 'Disrupted', tone: 'danger' },
  REBOOKED: { label: 'Rebooked', tone: 'warning' },
  HELD: { label: 'Held', tone: 'info' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  WAITLISTED: { label: 'Waitlisted', tone: 'warning' },
  RAC: { label: 'RAC', tone: 'warning' },
  PENDING: { label: 'Pending', tone: 'info' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
  FAILED: { label: 'Failed', tone: 'danger' },
  OPEN: { label: 'Open', tone: 'danger' },
  MONITORING: { label: 'Monitoring', tone: 'warning' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
  NEW: { label: 'New', tone: 'info' },
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  DECLINED: { label: 'Declined', tone: 'danger' },
  EXPIRED: { label: 'Expired', tone: 'neutral' },
  AVAILABLE: { label: 'Available', tone: 'success' },
  LIMITED: { label: 'Limited', tone: 'warning' },
  SOLD_OUT: { label: 'Sold out', tone: 'danger' },
  BOOKED: { label: 'Booked', tone: 'success' },
  UNREAD: { label: 'Unread', tone: 'info' },
  READ: { label: 'Read', tone: 'neutral' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  SUSPENDED: { label: 'Suspended', tone: 'danger' },
  PAID: { label: 'Paid', tone: 'success' },
} as const satisfies Record<string, StatusMeta>

export type KnownStatus = keyof typeof STATUS_META

function humanizeStatus(status: string): string {
  const words = status.trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (!words) {
    return 'Unknown'
  }
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function getStatusMeta(status: string): StatusMeta {
  const key = status.trim().toUpperCase().replace(/[\s-]+/g, '_') as KnownStatus
  return STATUS_META[key] ?? { label: humanizeStatus(status), tone: 'neutral' }
}
