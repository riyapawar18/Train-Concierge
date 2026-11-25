export type HotelBookingStatus =
  | 'CONFIRMED'
  | 'LATE_ARRIVAL_NOTED'
  | 'AT_RISK'
  | 'SHIFTED'
  | 'CANCELLED'

export type HotelImpactVerdict =
  | 'UNAFFECTED'
  | 'LATE_ARRIVAL_OK'
  | 'PAST_CUTOFF_EXTENSION_POSSIBLE'
  | 'PAST_CUTOFF_NO_EXTENSION'
  | 'NIGHT_LOST'
  | 'CHECKOUT_PRESSURE'

export type HotelExtensionType = 'LATE_ARRIVAL' | 'LATE_CHECKOUT' | 'EXTRA_NIGHT' | 'SHIFT_STAY'
export type HotelExtensionStatus = 'REQUESTED' | 'APPROVED' | 'DECLINED' | 'NOT_NEEDED'

export interface HotelSummary {
  id: number
  name: string
  stationCode: string
  address: string
  distanceKm: number
  priceMin: number
  priceMax: number
  rating: number
  phone: string
  email: string
  mapUrl: string
  availableRoomsTonight: number
}

export interface HotelPolicy {
  standardCheckinTime: string
  standardCheckoutTime: string
  lateArrivalAllowed: boolean
  lateArrivalCutoff: string | null
  lateCheckoutAllowed: boolean
  maxLateCheckoutTime: string | null
  lateCheckoutFeeType: 'FREE' | 'HOURLY' | 'FLAT' | 'HALF_DAY'
  lateCheckoutFeeAmount: number
  extraNightPossible: boolean
  freeChangeWindowHours: number
  extensionNeedsApproval: 'AUTO' | 'ON_REQUEST'
}

export interface RoomData {
  id: number
  roomNo: string
  roomType: 'STANDARD' | 'DELUXE' | 'SUITE'
  capacity: number
  pricePerNight: number
  status: 'AVAILABLE' | 'BOOKED' | 'HELD'
}

export interface FloorData {
  floor: number
  rooms: RoomData[]
}

export interface NightAvailability {
  date: string
  available: number
  total: number
}

export interface RoomMapResponse {
  floors: FloorData[]
  dateStrip: NightAvailability[]
  totalRooms: number
  availableTonight: number
}

export interface HotelImpactSummary {
  verdict: HotelImpactVerdict
  summary: string
  newArrivalAt: string
  arrivalVsCheckinMinutes: number
  actions: string[]
}

export interface ExtensionRequestResponse {
  id: number
  type: HotelExtensionType
  requestedTime: string | null
  requestedDate: string | null
  status: HotelExtensionStatus
  feeEstimate: number | null
  responseNote: string | null
  createdAt: string
}

export interface HotelBookingResponse {
  id: number
  hotelId: number
  hotelName: string | null
  hotelPhone: string | null
  roomId: number
  roomNo: string | null
  roomType: string | null
  checkInDate: string
  checkInTime: string
  checkOutDate: string
  checkOutTime: string
  guests: number
  totalPrice: number
  status: HotelBookingStatus
  lateArrivalCutoff: string | null
  notes: string | null
  manualEntry: boolean
  journeyId: number | null
  createdAt: string
  impact: HotelImpactSummary | null
  extensionRequests: ExtensionRequestResponse[]
}

export interface HotelImpactResponse {
  hotelBookingId: number
  hotelName: string
  verdict: HotelImpactVerdict
  summary: string
  newArrivalAt: string
  arrivalVsCheckinMinutes: number
  actions: string[]
}

export interface RoomHoldResponse {
  holdId: number
  expiresAt: string
  roomAvailabilityIds: number[]
}

export interface CreateHotelBookingRequest {
  hotelId: number
  roomId: number
  checkInDate: string
  checkOutDate: string
  guests: number
  totalPrice: number
  journeyId?: number | null
  holdId?: number | null
}

export interface ManualHotelBookingRequest {
  hotelId: number
  checkInDate: string
  checkOutDate: string
  checkInTime?: string
  checkOutTime?: string
  guests: number
  lateArrivalCutoff?: string
  notes?: string
  journeyId?: number | null
}
