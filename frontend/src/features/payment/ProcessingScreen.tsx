import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, LoaderCircle, Lock } from 'lucide-react'
import { formatExact } from './transaction'
import type { PaymentAuthorization, PaymentMethodId } from './types'

const STEP_MS = 520

const STEPS: Record<PaymentMethodId, string[]> = {
  googlepay: [
    'Sending request to Google Pay',
    'Awaiting bank confirmation',
    'Debiting your UPI account',
    'Confirming with TrainConcierge',
    'Issuing booking reference',
  ],
  phonepe: [
    'Sending request to PhonePe',
    'Validating security PIN',
    'Debiting your UPI account',
    'Confirming with TrainConcierge',
    'Issuing booking reference',
  ],
  paytm: [
    'Sending request to Paytm',
    'Verifying one-time password',
    'Debiting your wallet or bank',
    'Confirming with TrainConcierge',
    'Issuing booking reference',
  ],
  upi: [
    'Passing collect request to NPCI',
    'Awaiting approval on your UPI app',
    'Debiting your UPI account',
    'Confirming with TrainConcierge',
    'Issuing booking reference',
  ],
  qr: [
    'Matching payment against QR intent',
    'Awaiting bank confirmation',
    'Debiting your UPI account',
    'Confirming with TrainConcierge',
    'Issuing booking reference',
  ],
  card: [
    'Validating card with the issuer',
    'Authenticating via 3-D Secure',
    'Requesting settlement from bank',
    'Confirming with TrainConcierge',
    'Issuing booking reference',
  ],
  netbanking: [
    'Connecting to your bank',
    'Authenticating the session',
    'Debiting your account',
    'Confirming with TrainConcierge',
    'Issuing booking reference',
  ],
}

interface ProcessingScreenProps {
  amount: number
  authorization: PaymentAuthorization
  /** Notified once every step has animated to completion. */
  onComplete: () => void
}

/** Multi-stage payment animation shown while the booking is being created. */
function ProcessingScreen({ amount, authorization, onComplete }: ProcessingScreenProps) {
  const steps = useMemo(() => STEPS[authorization.method], [authorization.method])
  const [index, setIndex] = useState(0)
  const completed = useRef(false)
  const completeRef = useRef(onComplete)

  useEffect(() => {
    completeRef.current = onComplete
  })

  useEffect(() => {
    if (index >= steps.length) {
      if (!completed.current) {
        completed.current = true
        completeRef.current()
      }
      return
    }
    const timer = window.setTimeout(
      () => setIndex((current) => current + 1),
      index === 0 ? 260 : STEP_MS,
    )
    return () => window.clearTimeout(timer)
  }, [index, steps.length])

  const progress = Math.min(100, Math.round((index / steps.length) * 100))

  return (
    <div className="flex min-h-0 flex-1 flex-col" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 pt-4 text-center">
        <span className="relative grid size-16 place-items-center rounded-full bg-brand-navy/10 text-brand-navy">
          <LoaderCircle className="size-8 animate-spin" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-text">Processing payment…</p>
          <p className="mt-1 text-xs text-muted tabular-nums">
            {formatExact(amount)} via {authorization.methodLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-brand-navy transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(6, progress)}%` }}
        />
      </div>

      <ol className="mt-4 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {steps.map((label, stepIndex) => {
          const state = stepIndex < index ? 'done' : stepIndex === index ? 'active' : 'todo'
          return (
            <li
              key={label}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                state === 'active'
                  ? 'border-brand-navy/30 bg-brand-navy/5 text-text'
                  : state === 'done'
                    ? 'border-transparent bg-success-soft/50 text-text'
                    : 'border-transparent bg-surface-muted/50 text-muted'
              }`}
            >
              <span className="grid size-5 shrink-0 place-items-center">
                {state === 'done' ? (
                  <Check className="size-4 text-success" aria-hidden="true" />
                ) : state === 'active' ? (
                  <LoaderCircle className="size-4 animate-spin text-brand-navy" aria-hidden="true" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted/50" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {state === 'done' ? (
                <span className="shrink-0 text-[11px] font-medium text-success">Done</span>
              ) : null}
            </li>
          )
        })}
      </ol>

      <div className="mt-3 shrink-0 rounded-lg bg-surface-muted px-3 py-2">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-warning">
          <Lock className="size-3.5" aria-hidden="true" />
          Please do not close or refresh this window
        </p>
        <p className="mt-1 text-center text-[11px] text-muted">
          Paying from {authorization.payerReference}.
        </p>
      </div>
    </div>
  )
}

export { ProcessingScreen }
