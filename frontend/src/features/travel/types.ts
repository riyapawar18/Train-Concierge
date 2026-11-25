export type AvailabilityLevel = 'PLENTY' | 'LOW' | 'VERY_LOW' | 'WAITLIST'
export type SeatStatus = 'AVAILABLE' | 'OCCUPIED' | 'HELD'
export type CoachLayout = 'BERTH' | 'CHAIR_2x2' | 'CHAIR_3x2' | 'CHAIR_2x1'
export type TrainType =
  | 'RAJDHANI'
  | 'SHATABDI'
  | 'EXPRESS'
  | 'SUPERFAST'
  | 'VANDE_BHARAT'
  | 'OTHER'
export type QuotaCode =
  | 'GENERAL'
  | 'TATKAL'
  | 'LADIES'
  | 'SENIOR_CITIZEN'
  | 'PREMIUM_TATKAL'
export type SortCode = 'DEPARTURE' | 'ARRIVAL' | 'DURATION' | 'FARE'
export type TrainRunStatus = 'ON_TIME' | 'DELAYED' | 'CANCELLED'

export interface StationSuggestion {
  code: string
  name: string
  city: string
  state: string
}

export interface StationValue {
  code: string
  name: string
}

export interface SearchStation {
  code: string
  name: string
  city: string
}

export interface SegmentFrom {
  code: string
  name: string
  departure: string
  dayOffset: number
}

export interface SegmentTo {
  code: string
  name: string
  arrival: string
  dayOffset: number
}

export interface ClassAvailability {
  code: string
  name: string
  fare: number
  baseFare: number
  available: number
  total: number
  label: string
  level: AvailabilityLevel
}

export interface TrainResult {
  trainNumber: string
  trainName: string
  type: TrainType
  from: SegmentFrom
  to: SegmentTo
  durationMinutes: number
  distanceKm: number
  runsOn: string[]
  classes: ClassAvailability[]
}

export interface StationOption {
  code: string
  name: string
  count: number
}

export interface ClassOption {
  code: string
  name: string
  count: number
}

export interface TrainSearchResponse {
  from: SearchStation
  to: SearchStation
  date: string
  quota: QuotaCode
  count: number
  results: TrainResult[]
  fromStations: StationOption[]
  toStations: StationOption[]
  classes: ClassOption[]
}

export interface AvailabilityResponse {
  trainNumber: string
  trainName: string
  date: string
  classes: ClassAvailability[]
}

export interface CoachAvailability {
  id: number
  coachNo: string
  classCode: string
  layout: CoachLayout
  total: number
  available: number
  occupied: number
  held: number
}

export interface CoachesResponse {
  trainNumber: string
  trainName: string
  date: string
  classCode: string
  className: string
  coaches: CoachAvailability[]
}

export interface Seat {
  seatNo: number
  berthType: string
  berthLabel: string
  status: SeatStatus
  heldUntil: string | null
}

export interface SeatSummary {
  total: number
  available: number
  occupied: number
  held: number
}

export interface SeatMap {
  trainNumber: string
  trainName: string
  date: string
  classCode: string
  className: string
  coach: CoachAvailability
  classSummary: SeatSummary
  seats: Seat[]
}

export interface SeatHold {
  id: number
  trainNumber: string
  date: string
  coachId: number
  coachNo: string
  seatNo: number
  berthType: string
  berthLabel: string
  label: string
  heldUntil: string
}

export interface SeatHoldInput {
  trainNumber: string
  date: string
  coachId: number
  seatNo: number
}

export interface TrainStatusStop {
  stationCode: string
  stationName: string
  stopOrder: number
  arrivalTime: string | null
  departureTime: string | null
  dayOffset: number
  distanceKm: number
}

export interface TrainStatusResponse {
  trainNumber: string
  trainName: string
  date: string
  status: TrainRunStatus
  delayMinutes: number
  simulated: boolean
  disruptionHref: string | null
  disruptionTitle: string | null
  schedule: TrainStatusStop[]
}

export interface SearchFilters {
  from: string
  to: string
  date: string
  classCodes?: string[]
  quota?: QuotaCode
  types?: string[]
  depFrom?: number
  depTo?: number
  arrFrom?: number
  arrTo?: number
  fromStations?: string[]
  toStations?: string[]
  sort?: SortCode
}

export interface SearchValues {
  from: StationValue | null
  to: StationValue | null
  date: string
  classCode: string
  quota: QuotaCode
  pwd: boolean
  flexible: boolean
  railPass: boolean
}
