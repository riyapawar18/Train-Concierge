import type { HotelBookingStatus, HotelImpactVerdict } from './types'

export function bookingStatusLabel(status: HotelBookingStatus): string {
  switch (status) {
    case 'CONFIRMED': return 'Confirmed'
    case 'LATE_ARRIVAL_NOTED': return 'Late arrival noted'
    case 'AT_RISK': return 'At risk'
    case 'SHIFTED': return 'Shifted'
    case 'CANCELLED': return 'Cancelled'
  }
}

export function bookingStatusTone(
  status: HotelBookingStatus,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (status) {
    case 'CONFIRMED': return 'success'
    case 'LATE_ARRIVAL_NOTED': return 'info'
    case 'AT_RISK': return 'danger'
    case 'SHIFTED': return 'warning'
    case 'CANCELLED': return 'neutral'
  }
}

export function verdictLabel(verdict: HotelImpactVerdict): string {
  switch (verdict) {
    case 'UNAFFECTED': return 'Unaffected'
    case 'LATE_ARRIVAL_OK': return 'Late arrival OK'
    case 'PAST_CUTOFF_EXTENSION_POSSIBLE': return 'Past cutoff – extension possible'
    case 'PAST_CUTOFF_NO_EXTENSION': return 'Past cutoff – no extension'
    case 'NIGHT_LOST': return 'Night lost'
    case 'CHECKOUT_PRESSURE': return 'Checkout pressure'
  }
}

export function verdictTone(
  verdict: HotelImpactVerdict,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (verdict) {
    case 'UNAFFECTED': return 'success'
    case 'LATE_ARRIVAL_OK': return 'info'
    case 'PAST_CUTOFF_EXTENSION_POSSIBLE': return 'warning'
    case 'PAST_CUTOFF_NO_EXTENSION': return 'danger'
    case 'NIGHT_LOST': return 'danger'
    case 'CHECKOUT_PRESSURE': return 'warning'
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}
