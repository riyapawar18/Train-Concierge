import { formatDuration } from '@/features/travel/constants'
import type { Tone } from '@/features/travel/constants'
import type {
  DisruptionSeverity,
  DisruptionStatus,
  DisruptionType,
  ImpactLevel,
  RecommendationKind,
} from './types'

export const TYPE_OPTIONS: Array<{ value: DisruptionType; label: string }> = [
  { value: 'DELAY', label: 'Delay' },
  { value: 'CANCELLATION', label: 'Cancellation' },
]

export const SEVERITY_OPTIONS: Array<{ value: DisruptionSeverity; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
]

export const QUICK_DELAYS = [30, 60, 120, 240]

export const REASON_PRESETS = [
  'Signal failure',
  'Track maintenance',
  'Heavy rain',
  'Fog and poor visibility',
  'Rolling stock issue',
]

export const STATUS_FILTERS: Array<{ value: DisruptionStatus | 'ALL'; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ALL', label: 'All' },
]

export const PASSENGER_STATUS_FILTERS: Array<{ value: DisruptionStatus | 'ALL'; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ALL', label: 'All updates' },
]

export const SEVERITY_META: Record<DisruptionSeverity, { label: string; tone: Tone }> = {
  LOW: { label: 'Low severity', tone: 'info' },
  MEDIUM: { label: 'Medium severity', tone: 'warning' },
  HIGH: { label: 'High severity', tone: 'danger' },
}

export const IMPACT_META: Record<ImpactLevel, { label: string; tone: Tone }> = {
  MINOR: { label: 'Minor impact', tone: 'info' },
  MODERATE: { label: 'Moderate impact', tone: 'warning' },
  SEVERE: { label: 'Severe impact', tone: 'danger' },
}

export const DISRUPTION_STATUS_META: Record<DisruptionStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'danger' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
}

export const KIND_META: Record<RecommendationKind, { label: string; tone: Tone }> = {
  TRAIN: { label: 'Train', tone: 'info' },
  BUS: { label: 'Bus', tone: 'warning' },
  WAIT: { label: 'Wait', tone: 'neutral' },
}

export function typeLabel(type: DisruptionType): string {
  return TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type
}

export function severityMeta(value: DisruptionSeverity) {
  return SEVERITY_META[value] ?? { label: value, tone: 'neutral' as Tone }
}

export function impactMeta(value: ImpactLevel) {
  return IMPACT_META[value] ?? { label: value, tone: 'neutral' as Tone }
}

export function disruptionStatusMeta(value: DisruptionStatus) {
  return DISRUPTION_STATUS_META[value] ?? { label: value, tone: 'neutral' as Tone }
}

export function kindMeta(value: RecommendationKind) {
  return KIND_META[value] ?? { label: value, tone: 'neutral' as Tone }
}

export function formatDelay(type: DisruptionType, delayMinutes: number | null): string {
  if (type === 'CANCELLATION') {
    return 'Cancelled'
  }
  return delayMinutes ? `Delayed ${formatDuration(delayMinutes)}` : 'Delay'
}
