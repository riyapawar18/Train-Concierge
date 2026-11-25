import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, Check, Copy, LayoutGrid, ReceiptText, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadPaymentReceipt } from './receipt'
import { formatExact, formatPaidAt } from './transaction'
import type { PaymentTransaction } from './types'

interface PaymentSuccessScreenProps {
  txn: PaymentTransaction
  /** Present when the host knows where the booking lives. */
  onViewDetails?: () => void
  onBackToDashboard: () => void
  /** Extra host action, e.g. keep the e-ticket download available. */
  onContinue?: () => void
  continueLabel?: string
}

function DetailRow({
  label,
  value,
  mono = false,
  copyable = false,
}: {
  label: string
  value: string
  mono?: boolean
  copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const copy = async () => {
    const clipboard = navigator.clipboard
    if (!clipboard?.writeText) return
    try {
      await clipboard.writeText(value)
      setCopied(true)
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked (insecure context or denied) — the value stays on screen.
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd
        className={`flex min-w-0 items-center gap-1.5 text-right text-xs font-medium text-text ${
          mono ? 'font-mono break-all' : ''
        }`}
      >
        <span className="min-w-0 break-all text-right">{value}</span>
        {copyable ? (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy ${label}`}
            className="grid size-6 shrink-0 place-items-center rounded text-muted hover:bg-surface-muted hover:text-text"
          >
            {copied ? (
              <Check className="size-3.5 text-success" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </dd>
    </div>
  )
}

/** Terminal screen of the checkout: amount, references, method and booking. */
function PaymentSuccessScreen({
  txn,
  onViewDetails,
  onBackToDashboard,
  onContinue,
  continueLabel,
}: PaymentSuccessScreenProps) {
  const { confirmation } = txn

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <span className="relative grid size-20 place-items-center">
          <span
            className="pay-ring absolute inset-0 rounded-full border-2 border-success/40"
            aria-hidden="true"
          />
          <span className="grid size-16 place-items-center rounded-full bg-success-soft">
            <svg viewBox="0 0 32 32" className="size-9" aria-hidden="true">
              <path
                className="pay-check"
                d="M8 16.5l5.2 5.2L24 11"
                fill="none"
                stroke="var(--success)"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-text">Payment successful</h2>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted">
            <BadgeCheck className="size-3.5 text-success" aria-hidden="true" />
            Paid on {txn.methodLabel}
          </p>
        </div>

        <p className="text-3xl font-bold text-brand-navy tabular-nums">
          {formatExact(txn.amount)}
        </p>
        <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-success uppercase">
          Transaction successful
        </span>
      </div>

      <section className="mt-4 rounded-xl border border-border bg-surface px-3 py-2 pay-pop">
        <h3 className="px-1 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
          Transaction
        </h3>
        <dl className="divide-y divide-border/70">
          <DetailRow label="Amount paid" value={formatExact(txn.amount)} />
          <DetailRow label="Transaction ID" value={txn.transactionId} mono copyable />
          <DetailRow label="Bank / PSP reference" value={txn.bankReference} mono />
          <DetailRow label="Date & time" value={formatPaidAt(txn.paidAt)} />
          <DetailRow label="Payment method" value={txn.methodLabel} />
          <DetailRow label="Paid from" value={txn.payerReference} />
        </dl>
      </section>

      <section className="mt-3 rounded-xl border border-success/30 bg-success-soft/40 px-3 py-2">
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <h3 className="text-[11px] font-semibold tracking-wide text-success uppercase">
            Booking confirmation
          </h3>
          <span className="flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-semibold text-white">
            <Check className="size-3" aria-hidden="true" />
            Confirmed
          </span>
        </div>
        <dl className="divide-y divide-success/15">
          <DetailRow label={confirmation.referenceLabel} value={confirmation.reference} mono />
          {confirmation.summary.map((line) => (
            <DetailRow key={line.label} label={line.label} value={line.value} />
          ))}
        </dl>
      </section>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="cta" className="sm:col-span-2" onClick={() => downloadPaymentReceipt(txn)}>
          <ReceiptText className="size-4" aria-hidden="true" />
          Download receipt
        </Button>
        {onViewDetails ? (
          <Button variant="outline" onClick={onViewDetails}>
            <Ticket className="size-4" aria-hidden="true" />
            View booking details
          </Button>
        ) : null}
        {onContinue && continueLabel ? (
          <Button variant="outline" onClick={onContinue}>
            <LayoutGrid className="size-4" aria-hidden="true" />
            {continueLabel}
          </Button>
        ) : null}
        <Button
          variant={onViewDetails || onContinue ? 'ghost' : 'default'}
          className={onViewDetails && onContinue ? 'sm:col-span-2' : 'sm:col-span-2'}
          onClick={onBackToDashboard}
        >
          Return to dashboard
        </Button>
      </div>

      <p className="mt-3 shrink-0 text-center text-[11px] text-muted">
        Keep the transaction ID for any payment-related queries. A receipt is also available
        from the booking screen.
      </p>
    </div>
  )
}

export { PaymentSuccessScreen, type PaymentSuccessScreenProps }
