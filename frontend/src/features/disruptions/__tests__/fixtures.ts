import { addDaysIso, todayIso } from '@/features/travel/date'
import type {
  AdminDisruption,
  AdminDisruptionDetail,
  AdminImpact,
  JourneyImpact,
  PassengerDisruption,
  PassengerDisruptionDetail,
  Recommendation,
} from '../types'

export const travelDate = addDaysIso(todayIso(), 2)

export function localDateTime(daysAhead: number, time: string): string {
  return `${addDaysIso(todayIso(), daysAhead)}T${time}:00`
}

export function adminDisruption(overrides: Partial<AdminDisruption> = {}): AdminDisruption {
  return {
    id: 1,
    trainNumber: '11007',
    trainName: 'Deccan Express',
    travelDate,
    type: 'DELAY',
    delayMinutes: 195,
    reason: 'Signal failure near Lonavala',
    severity: 'HIGH',
    status: 'ACTIVE',
    affectedPassengers: 4,
    affectedBookings: 2,
    recommendationCount: 8,
    createdAt: localDateTime(0, '09:30'),
    resolvedAt: null,
    ...overrides,
  }
}

export function adminImpact(overrides: Partial<AdminImpact> = {}): AdminImpact {
  return {
    id: 11,
    journeyId: 501,
    bookingId: 21,
    pnr: '1234567890',
    passengerNames: ['Asha Verma', 'Mohan Verma'],
    fromCode: 'PUNE',
    fromName: 'Pune Junction',
    toCode: 'CSMT',
    toName: 'Mumbai CSMT',
    originalArrival: localDateTime(2, '19:45'),
    newArrival: localDateTime(2, '23:00'),
    delayMinutes: 195,
    missedConnection: false,
    overnight: true,
    needsHotel: true,
    impactLevel: 'MODERATE',
    summary:
      'Train 11007 is delayed by 3h 15m. You will reach Mumbai CSMT at 23:00. This journey now runs overnight; hotel options are available.',
    recommendationCount: 4,
    ...overrides,
  }
}

export function adminDetail(
  overrides: Partial<AdminDisruptionDetail> = {},
): AdminDisruptionDetail {
  return {
    ...adminDisruption(),
    impacts: [adminImpact()],
    ...overrides,
  }
}

export function passengerDisruption(
  overrides: Partial<PassengerDisruption> = {},
): PassengerDisruption {
  return {
    id: 1,
    impactId: 11,
    journeyId: 501,
    trainNumber: '11007',
    trainName: 'Deccan Express',
    travelDate,
    fromCode: 'PUNE',
    fromName: 'Pune Junction',
    toCode: 'CSMT',
    toName: 'Mumbai CSMT',
    type: 'DELAY',
    delayMinutes: 195,
    reason: 'Signal failure near Lonavala',
    severity: 'HIGH',
    status: 'ACTIVE',
    impactLevel: 'MODERATE',
    summary: 'Train 11007 is delayed by 3h 15m. You will reach Mumbai CSMT at 23:00.',
    originalArrival: localDateTime(2, '19:45'),
    newArrival: localDateTime(2, '23:00'),
    missedConnection: false,
    overnight: true,
    needsHotel: true,
    journeyStatus: 'DISRUPTED',
    createdAt: localDateTime(0, '09:30'),
    ...overrides,
  }
}

export function passengerDetail(
  overrides: Partial<PassengerDisruptionDetail> = {},
): PassengerDisruptionDetail {
  return {
    id: 1,
    trainNumber: '11007',
    trainName: 'Deccan Express',
    travelDate,
    type: 'DELAY',
    delayMinutes: 195,
    reason: 'Signal failure near Lonavala',
    severity: 'HIGH',
    status: 'ACTIVE',
    createdAt: localDateTime(0, '09:30'),
    impacts: [passengerDisruption()],
    ...overrides,
  }
}

export function journeyImpact(overrides: Partial<JourneyImpact> = {}): JourneyImpact {
  return {
    id: 11,
    disruptionId: 1,
    disruptionStatus: 'ACTIVE',
    disruptionType: 'DELAY',
    severity: 'HIGH',
    trainNumber: '11007',
    trainName: 'Deccan Express',
    fromCode: 'PUNE',
    fromName: 'Pune Junction',
    toCode: 'CSMT',
    toName: 'Mumbai CSMT',
    originalArrival: localDateTime(2, '19:45'),
    newArrival: localDateTime(2, '23:00'),
    delayMinutes: 195,
    missedConnection: false,
    overnight: true,
    needsHotel: true,
    impactLevel: 'MODERATE',
    summary: 'Train 11007 is delayed by 3h 15m. You will reach Mumbai CSMT at 23:00.',
    refundNote: null,
    ...overrides,
  }
}

export function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: 31,
    kind: 'TRAIN',
    refTrainNumber: '12169',
    refName: 'Intercity Express',
    refBusTripId: null,
    classCode: '3A',
    className: 'AC 3 Tier',
    fromStation: 'PUNE',
    fromName: 'Pune Junction',
    toStation: 'CSMT',
    toName: 'Mumbai CSMT',
    departureAt: localDateTime(2, '23:10'),
    arrivalAt: localDateTime(3, '02:25'),
    fare: 1840,
    seatsAvailable: 42,
    score: 60,
    rank: 1,
    recommended: true,
    reasons: ['Arrives 3h 15m earlier than the delayed train', 'Same class as your booking'],
    warnings: ['Arrives after midnight'],
    active: true,
    ...overrides,
  }
}
