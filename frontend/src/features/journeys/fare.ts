import type { QuotaCode } from '@/features/travel/types'

const AC_CLASSES = new Set(['1A', '2A', '3A', '3E', 'CC', 'EC', 'EV'])
const RESERVATION_CHARGE_AC = 60
const RESERVATION_CHARGE_NON_AC = 40
const GST_RATE = 0.05

const QUOTA_FACTOR: Record<QuotaCode, number> = {
  GENERAL: 1,
  TATKAL: 1.3,
  PREMIUM_TATKAL: 1.5,
  LADIES: 1,
  SENIOR_CITIZEN: 1,
}

export interface FareEstimate {
  perPassenger: number
  baseFare: number
  reservationCharge: number
  gst: number
  totalFare: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function roundToFive(value: number): number {
  return Math.round(value / 5) * 5
}

export function isAcClass(classCode: string): boolean {
  return AC_CLASSES.has(classCode.toUpperCase())
}

export function estimateFare(
  segmentBaseFare: number,
  classCode: string,
  quota: QuotaCode,
  passengers: number,
): FareEstimate {
  const count = Math.max(1, passengers)
  const perPassenger = roundToFive(segmentBaseFare * (QUOTA_FACTOR[quota] ?? 1))
  const baseFare = round2(perPassenger * count)
  const charge = isAcClass(classCode) ? RESERVATION_CHARGE_AC : RESERVATION_CHARGE_NON_AC
  const reservationCharge = round2(charge * count)
  const gst = round2((baseFare + reservationCharge) * GST_RATE)
  const totalFare = round2(baseFare + reservationCharge + gst)
  return { perPassenger, baseFare, reservationCharge, gst, totalFare }
}

export function estimateRefund(
  totalFare: number,
  boardingTime: string,
  now: Date = new Date(),
): { amount: number; percent: number } {
  const hours = Math.trunc((new Date(boardingTime).getTime() - now.getTime()) / 3_600_000)
  const percent = hours > 48 ? 75 : hours > 12 ? 50 : hours > 4 ? 25 : 0
  return { amount: round2((totalFare * percent) / 100), percent }
}
