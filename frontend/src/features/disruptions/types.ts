export type DisruptionType = 'DELAY' | 'CANCELLATION'
export type DisruptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH'
export type DisruptionStatus = 'ACTIVE' | 'RESOLVED'
export type ImpactLevel = 'MINOR' | 'MODERATE' | 'SEVERE'
export type RecommendationKind = 'TRAIN' | 'BUS' | 'WAIT'

export interface TrainSuggestion {
  number: string
  name: string
  runsOn: string
}

export interface DisruptionInput {
  trainNumber: string
  travelDate: string
  type: DisruptionType
  delayMinutes: number | null
  reason: string
  severity: DisruptionSeverity
}

export interface DisruptionPreview {
  affectedPassengers: number
  confirmedBookings: number
  message: string
}

export interface AdminImpact {
  id: number
  journeyId: number
  bookingId: number
  pnr: string
  passengerNames: string[]
  fromCode: string
  fromName: string
  toCode: string
  toName: string
  originalArrival: string
  newArrival: string | null
  delayMinutes: number
  missedConnection: boolean
  overnight: boolean
  needsHotel: boolean
  impactLevel: ImpactLevel
  summary: string
  recommendationCount: number
}

export interface AdminDisruption {
  id: number
  trainNumber: string
  trainName: string
  travelDate: string
  type: DisruptionType
  delayMinutes: number | null
  reason: string
  severity: DisruptionSeverity
  status: DisruptionStatus
  affectedPassengers: number
  affectedBookings: number
  recommendationCount: number
  createdAt: string
  resolvedAt: string | null
}

export interface AdminDisruptionDetail extends AdminDisruption {
  impacts: AdminImpact[]
}

export interface PassengerDisruption {
  id: number
  impactId: number
  journeyId: number
  trainNumber: string
  trainName: string
  travelDate: string
  fromCode: string
  fromName: string
  toCode: string
  toName: string
  type: DisruptionType
  delayMinutes: number | null
  reason: string
  severity: DisruptionSeverity
  status: DisruptionStatus
  impactLevel: ImpactLevel
  summary: string
  originalArrival: string
  newArrival: string | null
  missedConnection: boolean
  overnight: boolean
  needsHotel: boolean
  journeyStatus: string
  createdAt: string
}

export interface PassengerDisruptionDetail {
  id: number
  trainNumber: string
  trainName: string
  travelDate: string
  type: DisruptionType
  delayMinutes: number | null
  reason: string
  severity: DisruptionSeverity
  status: DisruptionStatus
  createdAt: string
  impacts: PassengerDisruption[]
}

export interface JourneyImpact {
  id: number
  disruptionId: number
  disruptionStatus: DisruptionStatus
  disruptionType: DisruptionType
  severity: DisruptionSeverity
  trainNumber: string
  trainName: string
  fromCode: string
  fromName: string
  toCode: string
  toName: string
  originalArrival: string
  newArrival: string | null
  delayMinutes: number
  missedConnection: boolean
  overnight: boolean
  needsHotel: boolean
  impactLevel: ImpactLevel
  summary: string
  refundNote: string | null
}

export interface Recommendation {
  id: number
  kind: RecommendationKind
  refTrainNumber: string | null
  refName: string | null
  refBusTripId: number | null
  classCode: string | null
  className: string | null
  fromStation: string
  fromName: string | null
  toStation: string
  toName: string | null
  departureAt: string
  arrivalAt: string
  fare: number
  seatsAvailable: number
  score: number
  rank: number
  recommended: boolean
  reasons: string[]
  warnings: string[]
  active: boolean
}
