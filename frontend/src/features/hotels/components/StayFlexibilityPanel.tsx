import { Check, X } from 'lucide-react'
import type { HotelPolicy } from '../types'
import { formatCurrency } from '../constants'
import { cn } from '@/lib/utils'

interface Props {
  policy: HotelPolicy
  className?: string
}

interface PolicyRow {
  supported: boolean
  label: string
  detail?: string
}

function buildRows(policy: HotelPolicy): PolicyRow[] {
  const rows: PolicyRow[] = []

  // Check-in / check-out header row is rendered separately
  if (policy.lateArrivalAllowed && policy.lateArrivalCutoff) {
    rows.push({
      supported: true,
      label: `Late arrival allowed until ${policy.lateArrivalCutoff}`,
    })
  } else {
    rows.push({ supported: false, label: 'Late arrival not guaranteed' })
  }

  if (policy.lateCheckoutAllowed) {
    const until = policy.maxLateCheckoutTime ? ` until ${policy.maxLateCheckoutTime}` : ''
    let fee = ''
    if (policy.lateCheckoutFeeType === 'HOURLY' && policy.lateCheckoutFeeAmount > 0) {
      fee = ` (approx. ${formatCurrency(policy.lateCheckoutFeeAmount)} per hour, on request)`
    } else if (policy.lateCheckoutFeeType === 'FLAT' && policy.lateCheckoutFeeAmount > 0) {
      fee = ` (approx. ${formatCurrency(policy.lateCheckoutFeeAmount)} flat fee, on request)`
    } else if (policy.lateCheckoutFeeType === 'HALF_DAY') {
      fee = ' (half-day charge, on request)'
    } else if (policy.lateCheckoutFeeType === 'FREE') {
      fee = ' at no charge, on request'
    }
    rows.push({ supported: true, label: `Late check-out${until}${fee}` })
  } else {
    rows.push({ supported: false, label: 'Late check-out not available' })
  }

  if (policy.extraNightPossible) {
    rows.push({ supported: true, label: 'Extra night available, subject to rooms' })
  } else {
    rows.push({ supported: false, label: 'Extra night not available' })
  }

  if (policy.freeChangeWindowHours > 0) {
    rows.push({
      supported: true,
      label: `Free date or time change up to ${policy.freeChangeWindowHours} h before check-in`,
    })
  }

  return rows
}

/**
 * Stay flexibility panel.
 *
 * Shown on the hotel detail page (above the Book button) and repeated in the
 * booking review step. Unsupported options are always visible, never hidden.
 * Fees are labelled as approximate.
 *
 * The policy displayed is as stated by the hotel.
 */
export function StayFlexibilityPanel({ policy, className }: Props) {
  const rows = buildRows(policy)

  return (
    <section
      aria-label="Stay flexibility policy"
      className={cn(
        'rounded-xl border border-border bg-surface p-4 text-sm',
        className,
      )}
    >
      <p className="mb-3 font-medium text-text">
        Check-in {policy.standardCheckinTime} · Check-out {policy.standardCheckoutTime}
      </p>

      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex items-start gap-2">
            {row.supported ? (
              <Check
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden="true"
              />
            ) : (
              <X
                className="mt-0.5 size-4 shrink-0 text-muted"
                aria-hidden="true"
              />
            )}
            <span className={cn(row.supported ? 'text-text' : 'text-muted')}>
              {row.label}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted">
        Policy as stated by the hotel. Fees are approximate. "Notify hotel" sends your
        details only — it does not confirm or hold your room.
      </p>
    </section>
  )
}
