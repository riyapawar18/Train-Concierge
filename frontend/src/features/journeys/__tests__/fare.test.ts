import { describe, expect, it } from 'vitest'
import { estimateFare, estimateRefund } from '../fare'

const NOW = new Date(2026, 9, 28, 10, 0, 0)

function localDateTime(offsetHours: number): string {
  const date = new Date(NOW.getTime() + offsetHours * 3_600_000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

describe('journey fare estimate', () => {
  it('mirrors the server fare rules for an AC class', () => {
    const fare = estimateFare(1245, '3A', 'GENERAL', 2)
    expect(fare.perPassenger).toBe(1245)
    expect(fare.baseFare).toBe(2490)
    expect(fare.reservationCharge).toBe(120)
    expect(fare.gst).toBe(130.5)
    expect(fare.totalFare).toBe(2740.5)
  })

  it('applies the non-AC reservation charge and quota multiplier', () => {
    const fare = estimateFare(500, 'SL', 'TATKAL', 1)
    expect(fare.perPassenger).toBe(650)
    expect(fare.reservationCharge).toBe(40)
    expect(fare.gst).toBe(34.5)
    expect(fare.totalFare).toBe(724.5)
  })
})

describe('refund estimate', () => {
  it('follows the tiered refund policy', () => {
    const at = (hours: number) => estimateRefund(1000, localDateTime(hours), NOW)
    expect(at(49)).toEqual({ amount: 750, percent: 75 })
    expect(at(48)).toEqual({ amount: 500, percent: 50 })
    expect(at(13)).toEqual({ amount: 500, percent: 50 })
    expect(at(12)).toEqual({ amount: 250, percent: 25 })
    expect(at(5)).toEqual({ amount: 250, percent: 25 })
    expect(at(4)).toEqual({ amount: 0, percent: 0 })
    expect(at(-2)).toEqual({ amount: 0, percent: 0 })
  })
})
