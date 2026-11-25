import { addDaysIso, todayIso } from '../date'
import type {
  AvailabilityResponse,
  CoachAvailability,
  CoachesResponse,
  SeatMap,
  TrainResult,
  TrainSearchResponse,
} from '../types'

export const travelDate = addDaysIso(todayIso(), 3)

export const deccanQueen: TrainResult = {
  trainNumber: '12123',
  trainName: 'Deccan Queen',
  type: 'EXPRESS',
  from: { code: 'PUNE', name: 'Pune Junction', departure: '07:15', dayOffset: 0 },
  to: { code: 'CSMT', name: 'Mumbai CSMT', arrival: '10:25', dayOffset: 0 },
  durationMinutes: 190,
  distanceKm: 192,
  runsOn: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
  classes: [
    {
      code: '3A',
      name: 'AC 3 Tier',
      fare: 1245,
      baseFare: 1245,
      available: 18,
      total: 144,
      label: 'AVL 18',
      level: 'PLENTY',
    },
    {
      code: 'CC',
      name: 'AC Chair Car',
      fare: 720,
      baseFare: 720,
      available: 3,
      total: 120,
      label: 'AVL 3',
      level: 'VERY_LOW',
    },
  ],
}

export const pragatiExpress: TrainResult = {
  trainNumber: '12125',
  trainName: 'Pragati Express',
  type: 'SUPERFAST',
  from: { code: 'PUNE', name: 'Pune Junction', departure: '18:30', dayOffset: 0 },
  to: { code: 'CSMT', name: 'Mumbai CSMT', arrival: '21:40', dayOffset: 0 },
  durationMinutes: 190,
  distanceKm: 192,
  runsOn: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  classes: [
    {
      code: '2A',
      name: 'AC 2 Tier',
      fare: 1780,
      baseFare: 1780,
      available: 0,
      total: 48,
      label: 'WL',
      level: 'WAITLIST',
    },
    {
      code: '3A',
      name: 'AC 3 Tier',
      fare: 1245,
      baseFare: 1245,
      available: 8,
      total: 144,
      label: 'AVL 8',
      level: 'LOW',
    },
  ],
}

export const searchResponse: TrainSearchResponse = {
  from: { code: 'PUNE', name: 'Pune Junction', city: 'Pune' },
  to: { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai' },
  date: travelDate,
  quota: 'GENERAL',
  count: 2,
  results: [deccanQueen, pragatiExpress],
  fromStations: [
    { code: 'PUNE', name: 'Pune Junction', count: 2 },
    { code: 'LNL', name: 'Lonavala', count: 1 },
  ],
  toStations: [
    { code: 'CSMT', name: 'Mumbai CSMT', count: 2 },
    { code: 'DR', name: 'Dadar Central', count: 1 },
  ],
  classes: [
    { code: '2A', name: 'AC 2 Tier', count: 1 },
    { code: '3A', name: 'AC 3 Tier', count: 2 },
    { code: 'CC', name: 'AC Chair Car', count: 1 },
  ],
}

export const emptyResponse: TrainSearchResponse = {
  ...searchResponse,
  count: 0,
  results: [],
  fromStations: [],
  toStations: [],
  classes: [],
}

export const seatCoach: CoachAvailability = {
  id: 11,
  coachNo: 'C1',
  classCode: 'CC',
  layout: 'CHAIR_3x2',
  total: 5,
  available: 2,
  occupied: 2,
  held: 1,
}

export const seatsAvailability: AvailabilityResponse = {
  trainNumber: '12125',
  trainName: 'Pragati Express',
  date: travelDate,
  classes: [
    {
      code: 'CC',
      name: 'AC Chair Car',
      fare: 720,
      baseFare: 720,
      available: 2,
      total: 5,
      label: 'AVL 2',
      level: 'VERY_LOW',
    },
    {
      code: '2A',
      name: 'AC 2 Tier',
      fare: 1780,
      baseFare: 1780,
      available: 0,
      total: 48,
      label: 'WL',
      level: 'WAITLIST',
    },
  ],
}

export const seatsCoaches: CoachesResponse = {
  trainNumber: '12125',
  trainName: 'Pragati Express',
  date: travelDate,
  classCode: 'CC',
  className: 'AC Chair Car',
  coaches: [seatCoach],
}

export const seatMap: SeatMap = {
  trainNumber: '12125',
  trainName: 'Pragati Express',
  date: travelDate,
  classCode: 'CC',
  className: 'AC Chair Car',
  coach: seatCoach,
  classSummary: { total: 5, available: 2, occupied: 2, held: 1 },
  seats: [
    { seatNo: 1, berthType: 'WS', berthLabel: 'Window', status: 'AVAILABLE', heldUntil: null },
    { seatNo: 2, berthType: 'MS', berthLabel: 'Middle', status: 'AVAILABLE', heldUntil: null },
    { seatNo: 3, berthType: 'AS', berthLabel: 'Aisle', status: 'OCCUPIED', heldUntil: null },
    { seatNo: 4, berthType: 'WS', berthLabel: 'Window', status: 'HELD', heldUntil: null },
    { seatNo: 5, berthType: 'MS', berthLabel: 'Middle', status: 'AVAILABLE', heldUntil: null },
  ],
}
