import { formatLongDate } from '@/features/travel/date'

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

export function parseLocalDateTime(value: string): Date | null {
  const match = LOCAL_DATE_TIME.exec(value)
  if (!match) {
    return null
  }
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  )
}

export function formatClock(value: string): string {
  const match = LOCAL_DATE_TIME.exec(value)
  return match ? `${match[4]}:${match[5]}` : value
}

export function formatDayTime(value: string): string {
  const date = parseLocalDateTime(value)
  if (!date) {
    return value
  }
  const day = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
  return `${day} · ${formatClock(value)}`
}

export function formatJourneyDate(iso: string): string {
  return formatLongDate(iso)
}

export function formatJourneyDuration(boardingTime: string, arrivalTime: string): string {
  const boarding = parseLocalDateTime(boardingTime)
  const arrival = parseLocalDateTime(arrivalTime)
  if (!boarding || !arrival) {
    return ''
  }
  const minutes = Math.max(0, Math.round((arrival.getTime() - boarding.getTime()) / 60_000))
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

export function formatTimeRange(boardingTime: string, arrivalTime: string): string {
  const boarding = parseLocalDateTime(boardingTime)
  const arrival = parseLocalDateTime(arrivalTime)
  if (!boarding || !arrival) {
    return `${formatClock(boardingTime)} → ${formatClock(arrivalTime)}`
  }
  const days = Math.round(
    (new Date(arrival.getFullYear(), arrival.getMonth(), arrival.getDate()).getTime() -
      new Date(boarding.getFullYear(), boarding.getMonth(), boarding.getDate()).getTime()) /
      86_400_000,
  )
  const suffix = days > 0 ? ` (+${days}d)` : ''
  return `${formatClock(boardingTime)} → ${formatClock(arrivalTime)}${suffix}`
}

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
}

export function genderLabel(value: string): string {
  return GENDER_LABELS[value.toUpperCase()] ?? value
}

export function formatSeatList(seatLabels: string[], limit = 2): string {
  if (seatLabels.length === 0) {
    return 'Seats pending'
  }
  if (seatLabels.length <= limit) {
    return seatLabels.join(' · ')
  }
  return `${seatLabels.slice(0, limit).join(' · ')} +${seatLabels.length - limit} more`
}
