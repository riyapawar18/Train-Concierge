import { api } from '@/lib/apiClient'
import type {
  BookingInput,
  BookingResponse,
  JourneyCancelResponse,
  JourneyDetail,
  JourneyListResponse,
  JourneySortCode,
  JourneyStatusParam,
  JourneySummary,
  JourneyUpdateInput,
} from './types'

export interface JourneyListQuery {
  status?: JourneyStatusParam
  from?: string
  to?: string
  q?: string
  page?: number
  size?: number
  sort?: JourneySortCode
}

export function createBooking(input: BookingInput): Promise<BookingResponse> {
  return api.post<BookingResponse>('/bookings', input)
}

export function getBookingByPnr(pnr: string): Promise<BookingResponse> {
  return api.get<BookingResponse>(`/bookings/pnr/${encodeURIComponent(pnr)}`)
}

export function getJourneys(query: JourneyListQuery): Promise<JourneyListResponse> {
  const params: Record<string, string | number> = {}
  if (query.status) {
    params.status = query.status
  }
  if (query.from) {
    params.from = query.from
  }
  if (query.to) {
    params.to = query.to
  }
  if (query.q) {
    params.q = query.q
  }
  if (query.page) {
    params.page = query.page
  }
  if (query.size) {
    params.size = query.size
  }
  if (query.sort) {
    params.sort = query.sort
  }
  return api.get<JourneyListResponse>('/journeys', { params })
}

export function getJourneySummary(): Promise<JourneySummary> {
  return api.get<JourneySummary>('/journeys/summary')
}

export function getJourney(id: number | string): Promise<JourneyDetail> {
  return api.get<JourneyDetail>(`/journeys/${id}`)
}

export function updateJourney(id: number | string, input: JourneyUpdateInput): Promise<JourneyDetail> {
  return api.put<JourneyDetail>(`/journeys/${id}`, input)
}

export function cancelJourney(id: number | string): Promise<JourneyCancelResponse> {
  return api.post<JourneyCancelResponse>(`/journeys/${id}/cancel`)
}
