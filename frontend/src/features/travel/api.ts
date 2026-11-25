import { api } from '@/lib/apiClient'
import type {
  AvailabilityResponse,
  CoachesResponse,
  SearchFilters,
  SeatHold,
  SeatHoldInput,
  SeatMap,
  StationSuggestion,
  TrainSearchResponse,
  TrainStatusResponse,
} from './types'

export function getStations(query: string, signal?: AbortSignal): Promise<StationSuggestion[]> {
  return api.get<StationSuggestion[]>('/stations', {
    params: { q: query },
    signal,
  })
}

export function searchTrains(filters: SearchFilters): Promise<TrainSearchResponse> {
  const params: Record<string, string | number> = {
    from: filters.from,
    to: filters.to,
    date: filters.date,
  }
  if (filters.classCodes?.length) {
    params.class = filters.classCodes.join(',')
  }
  if (filters.quota) {
    params.quota = filters.quota
  }
  if (filters.types?.length) {
    params.types = filters.types.join(',')
  }
  if (filters.depFrom !== undefined) {
    params.depFrom = filters.depFrom
  }
  if (filters.depTo !== undefined) {
    params.depTo = filters.depTo
  }
  if (filters.arrFrom !== undefined) {
    params.arrFrom = filters.arrFrom
  }
  if (filters.arrTo !== undefined) {
    params.arrTo = filters.arrTo
  }
  if (filters.fromStations?.length) {
    params.fromStations = filters.fromStations.join(',')
  }
  if (filters.toStations?.length) {
    params.toStations = filters.toStations.join(',')
  }
  if (filters.sort) {
    params.sort = filters.sort
  }
  return api.get<TrainSearchResponse>('/trains/search', { params })
}

export function getAvailability(
  trainNumber: string,
  date: string,
): Promise<AvailabilityResponse> {
  return api.get<AvailabilityResponse>(`/trains/${trainNumber}/availability`, {
    params: { date },
  })
}

export function getCoaches(
  trainNumber: string,
  date: string,
  classCode: string,
): Promise<CoachesResponse> {
  return api.get<CoachesResponse>(`/trains/${trainNumber}/coaches`, {
    params: { date, class: classCode },
  })
}

export function getSeatMap(
  trainNumber: string,
  date: string,
  classCode: string,
  coachId: number,
): Promise<SeatMap> {
  return api.get<SeatMap>(`/trains/${trainNumber}/seats`, {
    params: { date, class: classCode, coach: coachId },
  })
}

export function createSeatHold(input: SeatHoldInput): Promise<SeatHold> {
  return api.post<SeatHold>('/seat-holds', input)
}

export function releaseSeatHold(id: number): Promise<void> {
  return api.delete<void>(`/seat-holds/${id}`)
}

export function getTrainStatus(
  trainNumber: string,
  date: string,
): Promise<TrainStatusResponse> {
  return api.get<TrainStatusResponse>(`/trains/${trainNumber}/status`, {
    params: { date },
  })
}
