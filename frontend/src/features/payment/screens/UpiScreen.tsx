import { useState } from 'react'
import { Info, Radar, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatExact } from '../transaction'
import type { MethodScreenProps } from '../types'
import { AppShell, LabeledInput, useCountdown } from './shared'

const UPI_ORANGE = '#f26522'
const VPA_PATTERN = /^[a-zA-Z0-9._-]{3,}@[a-zA-Z]{3,}$/
const HANDLES = ['@ybl', '@okicici', '@paytm', '@axisbank', '@iblup']

/** Two-second-tick clock as shown for a live collect request, e.g. "0:07". */
function secondsLabel(value: number): string {
  return `0:${String(Math.max(0, value)).padStart(2, '0')}`
}

/**
 * Generic UPI collect-request flow: enter a VPA, raise the collect request, then
 * approve it the way the passenger's own UPI app would.
 */
function UpiScreen({ subject, onPay, onCancel, error }: MethodScreenProps) {
  const [pending, setPending] = useState(false)
  const [vpa, setVpa] = useState('')
  const [attempted, setAttempted] = useState(false)
  const { remaining, restart } = useCountdown(45, pending)

  const trimmed = vpa.trim()
  const isValid = VPA_PATTERN.test(trimmed)
  const expired = pending && remaining <= 0

  const submit = () => {
    setAttempted(true)
    if (isValid) setPending(true)
  }

  return (
    <AppShell
      onCancel={pending ? () => setPending(false) : onCancel}
      headerStyle={{ background: UPI_ORANGE, color: '#ffffff' }}
      brand={
        <span className="flex items-baseline gap-2 text-white">
          <span className="text-[17px] font-semibold tracking-tight">UPI</span>
          <span className="text-xs font-medium text-white/85">Collect request</span>
        </span>
      }
      statusText={`Pay ${formatExact(subject.amount)} to TrainConcierge from any UPI app`}
      footer={
        pending ? null : (
          <div className="flex flex-col gap-2">
            <Button
              className="w-full text-sm font-semibold"
              style={{ background: UPI_ORANGE, color: '#ffffff' }}
              onClick={submit}
            >
              Request {formatExact(subject.amount)}
            </Button>
            {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Collect request sent to your UPI app
            </p>
          </div>
        )
      }
    >
      {pending ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span
            className="grid size-16 place-items-center rounded-full"
            style={{ background: '#ffe8db', color: UPI_ORANGE }}
          >
            <Radar className="pay-pulse size-8" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-text">
            Waiting for {trimmed} to approve {formatExact(subject.amount)}
          </p>
          <p className="text-xs text-muted tabular-nums">
            Request expires in {secondsLabel(remaining)}
          </p>
          <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-left text-[11px] text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            This request has landed on your UPI app. Approve it to complete the payment.
          </p>

          {expired ? (
            <p className="text-xs font-medium text-muted">Request expired — send it again</p>
          ) : null}

          <Button
            className="w-full text-sm font-semibold"
            style={{ background: UPI_ORANGE, color: '#ffffff' }}
            onClick={() =>
              onPay({ method: 'upi', methodLabel: 'UPI', payerReference: `${trimmed} · collect request` })
            }
          >
            Approve payment
          </Button>
          {expired ? (
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => restart()}
            >
              Resend request
            </Button>
          ) : (
            <Button variant="outline" className="w-full text-sm" onClick={() => setPending(false)}>
              Cancel request
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <LabeledInput
            label="UPI ID / VPA"
            value={vpa}
            onChange={(next) => {
              setVpa(next)
              setAttempted(false)
            }}
            placeholder="yourname@bank"
            error={attempted && !isValid ? 'Enter a valid UPI ID, e.g. name@bank.' : null}
          />

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted">Or add a bank handle</p>
            <div className="flex flex-wrap gap-1.5">
              {HANDLES.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  onClick={() => {
                    if (!vpa.includes('@')) setVpa(`${vpa}${handle}`)
                    setAttempted(false)
                  }}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-brand-navy transition-colors hover:bg-surface-muted"
                >
                  {handle}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

export { UpiScreen }
