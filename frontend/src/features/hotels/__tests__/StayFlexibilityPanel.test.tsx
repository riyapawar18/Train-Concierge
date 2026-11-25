import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StayFlexibilityPanel } from '../components/StayFlexibilityPanel'
import type { HotelPolicy } from '../types'

const fullPolicy: HotelPolicy = {
  standardCheckinTime: '14:00',
  standardCheckoutTime: '11:00',
  lateArrivalAllowed: true,
  lateArrivalCutoff: '23:59',
  lateCheckoutAllowed: true,
  maxLateCheckoutTime: '15:00',
  lateCheckoutFeeType: 'HOURLY',
  lateCheckoutFeeAmount: 300,
  extraNightPossible: true,
  freeChangeWindowHours: 24,
  extensionNeedsApproval: 'AUTO',
}

const restrictivePolicy: HotelPolicy = {
  standardCheckinTime: '12:00',
  standardCheckoutTime: '11:00',
  lateArrivalAllowed: true,
  lateArrivalCutoff: '22:00',
  lateCheckoutAllowed: false,
  maxLateCheckoutTime: null,
  lateCheckoutFeeType: 'FREE',
  lateCheckoutFeeAmount: 0,
  extraNightPossible: false,
  freeChangeWindowHours: 12,
  extensionNeedsApproval: 'ON_REQUEST',
}

describe('StayFlexibilityPanel', () => {
  it('shows check-in and check-out times', () => {
    render(<StayFlexibilityPanel policy={fullPolicy} />)
    expect(screen.getByText(/Check-in 14:00 · Check-out 11:00/)).toBeInTheDocument()
  })

  it('shows late arrival cutoff when allowed', () => {
    render(<StayFlexibilityPanel policy={fullPolicy} />)
    expect(screen.getByText(/Late arrival allowed until 23:59/)).toBeInTheDocument()
  })

  it('shows late checkout with hourly fee', () => {
    render(<StayFlexibilityPanel policy={fullPolicy} />)
    expect(screen.getByText(/Late check-out until 15:00/)).toBeInTheDocument()
    expect(screen.getByText(/per hour/)).toBeInTheDocument()
  })

  it('shows extra night available', () => {
    render(<StayFlexibilityPanel policy={fullPolicy} />)
    expect(screen.getByText(/Extra night available, subject to rooms/)).toBeInTheDocument()
  })

  it('shows free change window', () => {
    render(<StayFlexibilityPanel policy={fullPolicy} />)
    expect(screen.getByText(/Free date or time change up to 24 h/)).toBeInTheDocument()
  })

  it('shows late checkout NOT available when unsupported — never hidden', () => {
    render(<StayFlexibilityPanel policy={restrictivePolicy} />)
    expect(screen.getByText(/Late check-out not available/)).toBeInTheDocument()
  })

  it('shows extra night not available when unsupported — never hidden', () => {
    render(<StayFlexibilityPanel policy={restrictivePolicy} />)
    expect(screen.getByText(/Extra night not available/)).toBeInTheDocument()
  })

  it('shows honest wording about Notify hotel', () => {
    render(<StayFlexibilityPanel policy={fullPolicy} />)
    expect(
      screen.getByText(/does not confirm or hold your room/i),
    ).toBeInTheDocument()
  })
})
