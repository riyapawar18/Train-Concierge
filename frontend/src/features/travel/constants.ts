import type {
  AvailabilityLevel,
  QuotaCode,
  SortCode,
  TrainType,
} from './types'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface Option<T extends string> {
  value: T
  label: string
}

export const CLASS_OPTIONS: Option<string>[] = [
  { value: '1A', label: '1A · AC First Class' },
  { value: '2A', label: '2A · AC 2 Tier' },
  { value: '3A', label: '3A · AC 3 Tier' },
  { value: '3E', label: '3E · AC 3 Economy' },
  { value: 'SL', label: 'SL · Sleeper' },
  { value: 'CC', label: 'CC · AC Chair Car' },
  { value: 'EC', label: 'EC · Executive Chair Car' },
  { value: 'EV', label: 'EV · Vistadome AC' },
  { value: '2S', label: '2S · Second Sitting' },
]

export const QUOTA_OPTIONS: Option<QuotaCode>[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'TATKAL', label: 'Tatkal' },
  { value: 'LADIES', label: 'Ladies' },
  { value: 'SENIOR_CITIZEN', label: 'Senior Citizen' },
  { value: 'PREMIUM_TATKAL', label: 'Premium Tatkal' },
]

export const TYPE_FILTERS: Array<{ value: TrainType; label: string; tone: Tone }> = [
  { value: 'OTHER', label: 'Other', tone: 'neutral' },
  { value: 'RAJDHANI', label: 'Rajdhani', tone: 'danger' },
  { value: 'SHATABDI', label: 'Shatabdi', tone: 'warning' },
  { value: 'VANDE_BHARAT', label: 'Vande Bharat', tone: 'success' },
  { value: 'SUPERFAST', label: 'Superfast', tone: 'info' },
]

export const SORT_OPTIONS: Array<{ value: SortCode; label: string }> = [
  { value: 'DEPARTURE', label: 'Departure' },
  { value: 'ARRIVAL', label: 'Arrival' },
  { value: 'DURATION', label: 'Duration' },
  { value: 'FARE', label: 'Fare' },
]

export interface TimeBucket {
  label: string
  rangeLabel: string
  ariaLabel: string
  from: number
  to: number
}

export const TIME_BUCKETS: TimeBucket[] = [
  {
    label: 'Early Morning',
    rangeLabel: '00:00–06:00',
    ariaLabel: 'Early Morning, 00:00 to 06:00',
    from: 0,
    to: 360,
  },
  {
    label: 'Morning',
    rangeLabel: '06:00–12:00',
    ariaLabel: 'Morning, 06:00 to 12:00',
    from: 360,
    to: 720,
  },
  {
    label: 'Mid Day',
    rangeLabel: '12:00–18:00',
    ariaLabel: 'Mid Day, 12:00 to 18:00',
    from: 720,
    to: 1080,
  },
  {
    label: 'Night',
    rangeLabel: '18:00–24:00',
    ariaLabel: 'Night, 18:00 to 24:00',
    from: 1080,
    to: 1440,
  },
]

export const TONE_CHIP: Record<Tone, string> = {
  success: 'border-success/25 bg-success-soft text-success',
  warning: 'border-warning/25 bg-warning-soft text-warning',
  danger: 'border-danger/25 bg-danger-soft text-danger',
  info: 'border-info/25 bg-info-soft text-info',
  neutral: 'border-neutral/20 bg-neutral-soft text-neutral',
}

export const TONE_DOT: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-neutral',
}

export const TYPE_META: Record<string, { label: string; tone: Tone }> = {
  RAJDHANI: { label: 'Rajdhani', tone: 'danger' },
  SHATABDI: { label: 'Shatabdi', tone: 'warning' },
  EXPRESS: { label: 'Express', tone: 'neutral' },
  SUPERFAST: { label: 'Superfast', tone: 'info' },
  VANDE_BHARAT: { label: 'Vande Bharat', tone: 'success' },
  OTHER: { label: 'Other', tone: 'neutral' },
}

export const LEVEL_META: Record<AvailabilityLevel, { label: string; tone: Tone }> = {
  PLENTY: { label: 'Plenty', tone: 'success' },
  LOW: { label: 'Few seats', tone: 'warning' },
  VERY_LOW: { label: 'Very few', tone: 'danger' },
  WAITLIST: { label: 'Waitlist', tone: 'danger' },
}

export const LEVEL_BAR: Record<AvailabilityLevel, string> = {
  PLENTY: 'bg-success',
  LOW: 'bg-warning',
  VERY_LOW: 'bg-danger',
  WAITLIST: 'bg-danger',
}

export function formatFare(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return `${rest}m`
  }
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

export function formatClock(minutes: number): string {
  const clamped = Math.max(0, Math.min(1440, minutes))
  if (clamped === 1440) {
    return '24:00'
  }
  const hours = Math.floor(clamped / 60)
  return `${String(hours).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function className(code: string): string {
  return CLASS_OPTIONS.find((option) => option.value === code)?.label ?? code
}

export function quotaName(code: string): string {
  return QUOTA_OPTIONS.find((option) => option.value === code)?.label ?? code
}

export function typeMeta(type: string): { label: string; tone: Tone } {
  return TYPE_META[type] ?? { label: type, tone: 'neutral' }
}

export function runsOnLabel(days: string[]): string {
  if (days.length >= 7) {
    return 'Runs daily'
  }
  return `Runs ${days.map((day) => day.slice(0, 3)).join(', ')}`
}
