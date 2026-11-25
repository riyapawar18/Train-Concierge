import { api } from '@/lib/apiClient'
import type {
  CreateHotelBookingRequest,
  ExtensionRequestResponse,
  HotelBookingResponse,
  HotelImpactResponse,
  HotelPolicy,
  HotelSummary,
  ManualHotelBookingRequest,
  RoomHoldResponse,
  RoomMapResponse,
} from './types'

export interface HotelListQuery {
  station?: string
  sort?: 'distance' | 'price' | 'rating'
  price?: number
  rating?: number
  roomType?: string
}

export function getHotels(query: HotelListQuery): Promise<HotelSummary[]> {
  const params: Record<string, string | number> = {}
  if (query.station) params.station = query.station
  if (query.sort) params.sort = query.sort
  if (query.price) params.price = query.price
  if (query.rating) params.rating = query.rating
  if (query.roomType) params.roomType = query.roomType
  return api.get<HotelSummary[]>('/hotels', { params })
}

export function getHotel(id: number): Promise<HotelSummary> {
  return api.get<HotelSummary>(`/hotels/${id}`)
}

export function getHotelPolicy(id: number): Promise<HotelPolicy> {
  return api.get<HotelPolicy>(`/hotels/${id}/policy`)
}

export function getHotelRooms(
  id: number,
  checkIn?: string,
  checkOut?: string,
  type?: string,
): Promise<RoomMapResponse> {
  const params: Record<string, string> = {}
  if (checkIn) params.checkIn = checkIn
  if (checkOut) params.checkOut = checkOut
  if (type) params.type = type
  return api.get<RoomMapResponse>(`/hotels/${id}/rooms`, { params })
}

export function holdRoom(
  roomId: number,
  checkIn: string,
  checkOut: string,
): Promise<RoomHoldResponse> {
  return api.post<RoomHoldResponse>('/room-holds', { roomId, checkIn, checkOut })
}

export function releaseHold(roomId: number, checkIn: string, checkOut: string): Promise<void> {
  return api.delete<void>(`/room-holds/${roomId}`, { params: { checkIn, checkOut } })
}

export function createHotelBooking(req: CreateHotelBookingRequest): Promise<HotelBookingResponse> {
  return api.post<HotelBookingResponse>('/hotel-bookings', req)
}

export function createManualHotelBooking(req: ManualHotelBookingRequest): Promise<HotelBookingResponse> {
  return api.post<HotelBookingResponse>('/hotel-bookings/manual', req)
}

export function getMyHotelBookings(): Promise<HotelBookingResponse[]> {
  return api.get<HotelBookingResponse[]>('/hotel-bookings')
}

export function getHotelBooking(id: number): Promise<HotelBookingResponse> {
  return api.get<HotelBookingResponse>(`/hotel-bookings/${id}`)
}

export function createExtensionRequest(
  bookingId: number,
  type: string,
  requestedTime?: string,
  requestedDate?: string,
): Promise<ExtensionRequestResponse> {
  return api.post<ExtensionRequestResponse>(`/hotel-bookings/${bookingId}/extension-requests`, {
    type,
    requestedTime,
    requestedDate,
  })
}

export function shiftStay(
  bookingId: number,
  newCheckInDate: string,
  newCheckOutDate: string,
): Promise<HotelBookingResponse> {
  return api.post<HotelBookingResponse>(`/hotel-bookings/${bookingId}/shift`, {
    newCheckInDate,
    newCheckOutDate,
  })
}

export function cancelHotelBooking(bookingId: number): Promise<HotelBookingResponse> {
  return api.post<HotelBookingResponse>(`/hotel-bookings/${bookingId}/cancel`)
}

export function getJourneyHotelImpact(journeyId: number): Promise<HotelImpactResponse | null> {
  return api.get<HotelImpactResponse>(`/journeys/${journeyId}/hotel-impact`).catch(() => null)
}
