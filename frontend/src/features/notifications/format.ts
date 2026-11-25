import { parseLocalDateTime } from '@/features/journeys/format'

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date)
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(date)
}

export function formatNotificationTime(value: string): string {
  const date = parseLocalDateTime(value)
  if (!date) {
    return value
  }
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) {
    return formatShortDate(date)
  }
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) {
    return 'Just now'
  }
  if (minutes < 60) {
    return `${minutes} min ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const dayDiff = Math.round((startOfToday - startOfDate) / 86_400_000)
  if (dayDiff === 1) {
    return 'Yesterday'
  }
  if (dayDiff < 7) {
    return formatWeekday(date)
  }
  return formatShortDate(date)
}
