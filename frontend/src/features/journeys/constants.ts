import type { JourneySortCode, JourneyStatus, JourneyStatusParam, JourneySummary } from './types'

export interface JourneyStatusFilterOption {
  value: JourneyStatusParam
  label: string
  summaryKey: keyof JourneySummary
}

export const JOURNEY_STATUS_FILTERS: JourneyStatusFilterOption[] = [
  { value: 'ALL', label: 'All journeys', summaryKey: 'total' },
  { value: 'UPCOMING', label: 'Upcoming', summaryKey: 'upcoming' },
  { value: 'ACTIVE', label: 'Active', summaryKey: 'active' },
  { value: 'NEEDS_ATTENTION', label: 'Needs attention', summaryKey: 'needingAttention' },
  { value: 'COMPLETED', label: 'Completed', summaryKey: 'completed' },
  { value: 'CANCELLED', label: 'Cancelled', summaryKey: 'cancelled' },
]

export const JOURNEY_SORTS: Array<{ value: JourneySortCode; label: string }> = [
  { value: 'TRAVEL_DATE_ASC', label: 'Travel date (soonest)' },
  { value: 'TRAVEL_DATE_DESC', label: 'Travel date (latest)' },
  { value: 'CREATED_DESC', label: 'Recently booked' },
]

export const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
]

const STATUS_PARAMS = new Set<string>([
  'ALL',
  'UPCOMING',
  'ACTIVE',
  'NEEDS_ATTENTION',
  'COMPLETED',
  'CANCELLED',
])

export function readStatusParam(value: string | null): JourneyStatusParam {
  const normalized = (value ?? '').toUpperCase()
  return STATUS_PARAMS.has(normalized) ? (normalized as JourneyStatusParam) : 'ALL'
}

export function readSortParam(value: string | null): JourneySortCode {
  return value === 'TRAVEL_DATE_DESC' || value === 'CREATED_DESC' ? value : 'TRAVEL_DATE_ASC'
}

export function canEditJourney(status: JourneyStatus): boolean {
  return status === 'UPCOMING' || status === 'ACTIVE' || status === 'DISRUPTED'
}

export function canRenamePassengers(status: JourneyStatus): boolean {
  return status === 'UPCOMING'
}

export function canCancelJourney(status: JourneyStatus): boolean {
  return status !== 'CANCELLED' && status !== 'COMPLETED'
}
