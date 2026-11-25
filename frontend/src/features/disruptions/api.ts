import { api } from '@/lib/apiClient'
import type {
  AdminDisruption,
  AdminDisruptionDetail,
  AdminImpact,
  DisruptionInput,
  DisruptionPreview,
  DisruptionStatus,
  JourneyImpact,
  PassengerDisruption,
  PassengerDisruptionDetail,
  Recommendation,
  RecommendationKind,
  TrainSuggestion,
} from './types'

export interface AdminDisruptionQuery {
  status?: DisruptionStatus | 'ALL'
  train?: string
  date?: string
}

export function getTrainSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<TrainSuggestion[]> {
  return api.get<TrainSuggestion[]>('/admin/disruptions/trains', {
    params: { q: query },
    signal,
  })
}

export function previewDisruption(input: DisruptionInput): Promise<DisruptionPreview> {
  return api.post<DisruptionPreview>('/admin/disruptions/preview', input)
}

export function createDisruption(input: DisruptionInput): Promise<AdminDisruptionDetail> {
  return api.post<AdminDisruptionDetail>('/admin/disruptions', input)
}

export function getAdminDisruptions(query: AdminDisruptionQuery): Promise<AdminDisruption[]> {
  const params: Record<string, string> = {}
  if (query.status && query.status !== 'ALL') {
    params.status = query.status
  }
  if (query.train) {
    params.train = query.train
  }
  if (query.date) {
    params.date = query.date
  }
  return api.get<AdminDisruption[]>('/admin/disruptions', { params })
}

export function getAdminDisruption(id: number | string): Promise<AdminDisruptionDetail> {
  return api.get<AdminDisruptionDetail>(`/admin/disruptions/${id}`)
}

export function getAdminImpacts(id: number | string): Promise<AdminImpact[]> {
  return api.get<AdminImpact[]>(`/admin/disruptions/${id}/impacts`)
}

export function updateDisruption(
  id: number | string,
  input: { delayMinutes?: number; reason?: string },
): Promise<AdminDisruptionDetail> {
  return api.patch<AdminDisruptionDetail>(`/admin/disruptions/${id}`, input)
}

export function resolveDisruption(id: number | string): Promise<AdminDisruptionDetail> {
  return api.patch<AdminDisruptionDetail>(`/admin/disruptions/${id}/resolve`)
}

export function getMyDisruptions(status?: DisruptionStatus): Promise<PassengerDisruption[]> {
  return api.get<PassengerDisruption[]>('/disruptions/mine', {
    params: status ? { status } : undefined,
  })
}

export function getMyDisruption(id: number | string): Promise<PassengerDisruptionDetail> {
  return api.get<PassengerDisruptionDetail>(`/disruptions/${id}`)
}

export function getJourneyImpact(journeyId: number | string): Promise<JourneyImpact> {
  return api.get<JourneyImpact>(`/journeys/${journeyId}/impact`)
}

export function getRecommendations(
  journeyId: number | string,
  kind?: RecommendationKind,
): Promise<Recommendation[]> {
  return api.get<Recommendation[]>(`/journeys/${journeyId}/recommendations`, {
    params: kind ? { kind } : undefined,
  })
}
