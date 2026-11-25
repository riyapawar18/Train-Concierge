import type { QuotaCode } from '@/features/travel/types'

export type JourneyStatus =
  | 'UPCOMING'
  | 'ACTIVE'
  | 'DISRUPTED'
  | 'REBOOKED'
  | 'COMPLETED'
  | 'CANCELLED'

export type BookingStatus = 'HELD' | 'CONFIRMED' | 'REBOOKED' | 'CANCELLED'

export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

export type JourneySortCode = 'TRAVEL_DATE_ASC' | 'TRAVEL_DATE_DESC' | 'CREATED_DESC'

export type JourneyStatusParam =
  | 'ALL'
  | 'UPCOMING'
  | 'ACTIVE'
  | 'NEEDS_ATTENTION'
  | 'COMPLETED'
  | 'CANCELLED'

export interface StationRef {
  code: string
  name: string
  city: string
}

export interface FareBreakdown {
  baseFare: number
  reservationCharge: number
  gst: number
  totalFare: number
  perPassenger: number
}

export interface RefundInfo {
  amount: number
  percent: number
  label: string
  simulated: boolean
}

export interface BookingPassenger {
  id: number
  name: string
  age: number
  gender: string
  berthPreference: string | null
  seatNo: number | null
  berthType: string | null
  seatLabel: string
  coachNo: string | null
}

export interface BookingResponse {
  id: number
  pnr: string
  journeyId: number | null
  status: BookingStatus
  trainNumber: string
  trainName: string
  travelDate: string
  boardingTime: string
  arrivalTime: string
  classCode: string
  className: string
  quota: QuotaCode
  from: StationRef
  to: StationRef
  passengerCount: number
  passengers: BookingPassenger[]
  fare: FareBreakdown
  contactEmail: string | null
  contactMobile: string | null
  createdAt: string
  cancelledAt: string | null
  refund: RefundInfo | null
}

export interface JourneyListItem {
  id: number
  pnr: string
  title: string | null
  trainNumber: string
  trainName: string
  travelDate: string
  boardingTime: string
  arrivalTime: string
  classCode: string
  className: string
  quota: QuotaCode
  from: StationRef
  to: StationRef
  passengerCount: number
  seatLabels: string[]
  status: JourneyStatus
  bookingStatus: BookingStatus
  totalFare: number
  refundAmount: number | null
  refundPercent: number | null
  createdAt: string
}

export interface JourneyListResponse {
  items: JourneyListItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
  sort: JourneySortCode
  status: JourneyStatusParam
  serverTime: string
}

export interface JourneyPassenger extends BookingPassenger {}

export interface JourneyRouteStop {
  stationCode: string
  stationName: string
  arrivalTime: string | null
  departureTime: string | null
  dayOffset: number
  distanceKm: number
  boarding: boolean
  alighting: boolean
}

export interface JourneyDisruption {
  id: number
  title: string
  status: string
}

export interface JourneyHotel {
  name: string
  city: string
  note: string
}

export interface JourneyDetail {
  id: number
  pnr: string
  title: string | null
  notes: string | null
  status: JourneyStatus
  bookingStatus: BookingStatus
  trainNumber: string
  trainName: string
  travelDate: string
  boardingTime: string
  arrivalTime: string
  classCode: string
  className: string
  quota: QuotaCode
  from: StationRef
  to: StationRef
  passengers: JourneyPassenger[]
  fare: FareBreakdown
  route: JourneyRouteStop[]
  contactEmail: string | null
  contactMobile: string | null
  createdAt: string
  cancelledAt: string | null
  refund: RefundInfo | null
  disruption: JourneyDisruption | null
  hotel: JourneyHotel | null
}

export interface JourneySummary {
  upcoming: number
  active: number
  needingAttention: number
  completed: number
  cancelled: number
  disruptions: number
  total: number
}

export interface JourneyCancelResponse {
  journeyId: number
  pnr: string
  status: JourneyStatus
  refund: RefundInfo | null
  cancelledAt: string
}

export interface BookingPassengerInput {
  name: string
  age: number
  gender: Gender
}

export interface BookingInput {
  trainNumber: string
  date: string
  from: string
  to: string
  classCode: string
  quota: QuotaCode
  passengers: BookingPassengerInput[]
  holdIds: number[]
  contactEmail?: string
  contactMobile?: string
}

export interface JourneyUpdateInput {
  title?: string
  notes?: string
  passengers?: Array<{ id: number; name: string }>
}
