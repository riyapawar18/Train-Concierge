import { Info, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PAYMENT_METHODS } from '../methods'
import { formatExact } from '../transaction'
import type { PaymentMethodId, PaymentSubject } from '../types'
import { Avatar } from './shared'

interface PaymentMethodsScreenProps {
  subject: PaymentSubject
  onSelectMethod: (method: PaymentMethodId) => void
  onCancel: () => void
  error: string | null
}

const GROUPS: Array<{ id: 'upi' | 'other'; label: string; hint: string }> = [
  { id: 'upi', label: 'UPI & wallets', hint: 'Instant, works on any UPI app' },
  { id: 'other', label: 'Cards & net banking', hint: 'Bank authentication may take a moment' },
]

/** Step 1 of the checkout: booking summary, exact payable amount, method picker. */
function PaymentMethodsScreen({
  subject,
  onSelectMethod,
  onCancel,
  error,
}: PaymentMethodsScreenProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-text">Choose payment method</h2>
          <p className="mt-0.5 text-xs text-muted">
            Pick one to open its payment screen.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel payment">
          <X className="size-[18px]" aria-hidden="true" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        {/* Exact amount + booking details */}
        <section className="rounded-xl border border-brand-navy/20 bg-brand-navy/5 p-4">
          <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">
            Amount payable
          </p>
          <p className="mt-1 text-3xl font-bold text-brand-navy tabular-nums">
            {formatExact(subject.amount)}
          </p>
          <p className="mt-2 text-sm font-semibold text-text">{subject.title}</p>
          <p className="mt-0.5 text-xs text-muted">{subject.route}</p>
          <p className="text-xs text-muted">{subject.schedule}</p>
          {subject.lines.length > 0 ? (
            <dl className="mt-3 grid gap-1 border-t border-brand-navy/15 pt-3 text-xs">
              {subject.lines.map((line) => (
                <div key={line.label} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-muted">{line.label}</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-text">{line.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        {GROUPS.map((group) => {
          const methods = PAYMENT_METHODS.filter((method) => method.group === group.id)
          return (
            <section key={group.id} className="mt-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
                  {group.label}
                </h3>
                <p className="text-[11px] text-muted">{group.hint}</p>
              </div>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {methods.map((method) => {
                  const Icon = method.icon
                  return (
                    <li key={method.id}>
                      <button
                        type="button"
                        onClick={() => onSelectMethod(method.id)}
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-brand-navy/40 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                      >
                        <Avatar
                          label={method.mark.slice(0, 4)}
                          color={method.color}
                          textColor={method.onColor}
                          rounded="md"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <Icon
                              className="size-3.5 shrink-0 text-muted"
                              aria-hidden="true"
                            />
                            <span className="truncate text-sm font-medium text-text">
                              {method.label}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {method.tagline}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-[11px] text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Choose any method above. The fare is charged to the account you select and your booking
          is confirmed as soon as the payment succeeds.
        </p>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border pt-3">
        <p className="flex items-center gap-1.5 text-[11px] text-muted">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Secure checkout
        </p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel and go back
        </Button>
      </footer>
    </div>
  )
}

export { PaymentMethodsScreen, type PaymentMethodsScreenProps }
