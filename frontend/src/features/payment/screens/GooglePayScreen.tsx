import { useState } from 'react'
import { Fingerprint, Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PAYER_UPI_ACCOUNTS } from '../methods'
import { formatExact, initials, maskMobile } from '../transaction'
import type { MethodScreenProps, PaymentAuthorization } from '../types'
import { AppShell, Avatar, ChoiceRow, LabeledInput, PayToBlock, useDelayedAction } from './shared'

const GOOGLE_BLUE = '#1a73e8'
const ACCOUNT_COLORS: Record<string, string> = {
  hdfc: '#004c8f',
  icici: '#f58220',
  sbi: '#22409a',
}

/**
 * Google Pay sheet: pick a saved UPI-linked account, tap pay, then clear the
 * biometric confirmation before the debit is sent.
 */
function GooglePayScreen({ subject, onPay, onCancel, error }: MethodScreenProps) {
  const [pending, setPending] = useState<PaymentAuthorization | null>(null)
  const [accountId, setAccountId] = useState(PAYER_UPI_ACCOUNTS[0].id)
  const [adding, setAdding] = useState(false)
  const [customVpa, setCustomVpa] = useState('')
  const [vpaError, setVpaError] = useState<string | null>(null)

  const selected = PAYER_UPI_ACCOUNTS.find((account) => account.id === accountId)
  const payerReference = adding
    ? `UPI · ${customVpa.trim()}`
    : `${selected?.bank ?? 'UPI'} · ${selected?.vpa ?? ''}`

  useDelayedAction(() => {
    if (pending) onPay(pending)
  }, 1500, pending !== null)

  const payDisabled = adding ? !customVpa.trim().includes('@') : !selected

  return (
    <AppShell
      onCancel={onCancel}
      headerStyle={{ background: '#ffffff', color: '#5f6368', borderBottom: '1px solid #e8eaed' }}
      brand={
        <span className="text-[15px] font-medium tracking-tight" style={{ color: '#3c4043' }}>
          <span style={{ color: '#4285F4' }}>G</span>
          <span style={{ color: '#5f6368' }}> Pay</span>
        </span>
      }
      statusText={`Signed in as ${subject.payerName}${
        subject.payerEmail ? ` · ${subject.payerEmail}` : ''
      }`}
      footer={
        pending === null ? (
          <div className="flex flex-col gap-2">
            {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
            <Button
              className="w-full text-sm font-medium"
              style={{ background: GOOGLE_BLUE, color: '#ffffff' }}
              disabled={payDisabled}
              onClick={() =>
                setPending({ method: 'googlepay', methodLabel: 'Google Pay', payerReference })
              }
            >
              Pay {formatExact(subject.amount)}
            </Button>
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Pay with UPI · Google Pay
            </p>
          </div>
        ) : null
      }
    >
      {pending ? (
        <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
          <span
            className="grid size-20 place-items-center rounded-full"
            style={{ background: '#e8f0fe', color: GOOGLE_BLUE }}
          >
            <Fingerprint className="pay-pulse size-10" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: '#202124' }}>
              Verifying your biometrics
            </p>
            <p className="mt-1 text-xs text-muted">
              Confirming with the fingerprint saved on this device…
            </p>
          </div>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-muted">
            <div className="pay-bar h-full rounded-full" style={{ background: GOOGLE_BLUE }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <PayToBlock
            merchant="TrainConcierge"
            note={`Indian Railways · ${subject.title}`}
            amount={subject.amount}
          />

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Payment method
            </h3>
            {!adding ? (
              PAYER_UPI_ACCOUNTS.map((account) => (
                <ChoiceRow
                  key={account.id}
                  selected={accountId === account.id}
                  onSelect={() => setAccountId(account.id)}
                  title={account.bank}
                  subtitle={`${account.vpa} · ${formatExact(account.balance ?? 0)} available`}
                  leading={
                    <Avatar
                      label={initials(account.bank)}
                      color={ACCOUNT_COLORS[account.id] ?? '#5f6368'}
                    />
                  }
                />
              ))
            ) : (
              <LabeledInput
                label="UPI ID"
                value={customVpa}
                onChange={(next) => {
                  setCustomVpa(next)
                  setVpaError(null)
                }}
                placeholder="yourname@bank"
                error={vpaError ?? error}
              />
            )}

            <button
              type="button"
              onClick={() => {
                setAdding((current) => !current)
                setVpaError(null)
              }}
              className="flex items-center gap-2 self-start rounded-lg px-1 py-1 text-xs font-medium"
              style={{ color: GOOGLE_BLUE }}
            >
              <Plus className="size-4" aria-hidden="true" />
              {adding ? 'Use a saved account' : 'Add a new UPI ID'}
            </button>
          </section>

          <section className="rounded-xl border border-border bg-surface-muted/50 px-3 py-2.5">
            <p className="text-xs font-semibold text-text">Pay from</p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted">
              <li>{adding ? customVpa.trim() || 'not set' : `${selected?.vpa ?? ''}`}</li>
              <li>Mobile {maskMobile(subject.payerMobile)} · {subject.payerName}</li>
              <li>Note · {subject.route}</li>
            </ul>
          </section>
        </div>
      )}
    </AppShell>
  )
}

export { GooglePayScreen }
