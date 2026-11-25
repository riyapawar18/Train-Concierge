import { useState } from 'react'
import { Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PAYER_UPI_ACCOUNTS, PHONEPE_BALANCE } from '../methods'
import { formatExact, initials, maskMobile } from '../transaction'
import type { MethodScreenProps, PaymentAuthorization } from '../types'
import { AppShell, Avatar, ChoiceRow, PayToBlock, PinPad } from './shared'

const PHONEPE_PURPLE = '#5f259f'
const PHONEPE_DEEP = '#3d1670'

const BANK_COLORS: Record<string, string> = {
  hdfc: '#004c8f',
  icici: '#f58220',
  sbi: '#22409a',
}

/**
 * PhonePe sheet: balance and UPI-linked banks, then the six-digit
 * security PIN keypad the app raises before debiting.
 */
function PhonePeScreen({ subject, onPay, onCancel, error }: MethodScreenProps) {
  const [source, setSource] = useState<string>('wallet')
  const [pin, setPin] = useState('')
  const [pinStage, setPinStage] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)

  const bank = PAYER_UPI_ACCOUNTS.find((account) => account.id === source)
  // Keep the wallet solvent however large the fare is.
  const walletBalance = Math.max(PHONEPE_BALANCE, subject.amount + 1250)
  const payerReference =
    source === 'wallet'
      ? `PhonePe Wallet · balance ${formatExact(walletBalance)}`
      : `${bank?.bank} · ${bank?.vpa}`

  const confirm = () => {
    if (pin.length !== 6) {
      setPinError('Enter all 6 digits of your security PIN.')
      return
    }
    const authorization: PaymentAuthorization = {
      method: 'phonepe',
      methodLabel: 'PhonePe',
      payerReference,
    }
    setPinError(null)
    onPay(authorization)
  }

  return (
    <AppShell
      onCancel={pinStage ? () => setPinStage(false) : onCancel}
      headerStyle={{ background: PHONEPE_PURPLE, color: '#ffffff' }}
      brand={
        <span className="text-[17px] font-semibold tracking-tight text-white">
          phone<span style={{ color: '#c9a7f5' }}>pe</span>
        </span>
      }
      statusText={`Logged in as ${maskMobile(subject.payerMobile)} · ${subject.payerName}`}
      footer={
        pinStage ? null : (
          <div className="flex flex-col gap-2">
            {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
            <Button
              className="w-full text-sm font-semibold"
              style={{ background: PHONEPE_PURPLE, color: '#ffffff' }}
              onClick={() => {
                setPin('')
                setPinError(null)
                setPinStage(true)
              }}
            >
              Pay {formatExact(subject.amount)}
            </Button>
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              PhonePe Secure · encrypted checkout
            </p>
          </div>
        )
      }
    >
      {pinStage ? (
        <PinPad
          title="Enter your PhonePe security PIN"
          hint="Your 6-digit PhonePe security PIN"
          length={6}
          value={pin}
          onChange={(next) => {
            setPin(next)
            setPinError(null)
          }}
          onSubmit={confirm}
          submitLabel={`Pay ${formatExact(subject.amount)}`}
          error={pinError}
          note={
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <Lock className="size-3.5" aria-hidden="true" />
              Paying from {payerReference}
            </p>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <PayToBlock
            merchant="TrainConcierge"
            note={`Indian Railways · ${subject.title}`}
            amount={subject.amount}
          />

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Payment options
            </h3>
            <ChoiceRow
              selected={source === 'wallet'}
              onSelect={() => setSource('wallet')}
              title="PhonePe Balance"
              subtitle={`${formatExact(walletBalance)} available · add money to recharge`}
              leading={<Avatar label="PP" color={PHONEPE_DEEP} />}
            />
            {PAYER_UPI_ACCOUNTS.map((account) => (
              <ChoiceRow
                key={account.id}
                selected={source === account.id}
                onSelect={() => setSource(account.id)}
                title={`${account.bank} - ${account.last4}`}
                subtitle={`UPI · ${account.vpa}`}
                leading={
                  <Avatar
                    label={initials(account.bank)}
                    color={BANK_COLORS[account.id] ?? '#5f6368'}
                  />
                }
              />
            ))}
          </section>

          <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-[11px] text-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            PhonePe Secure Transactions checks every debit against your PIN before it is sent to
            the bank.
          </p>
        </div>
      )}
    </AppShell>
  )
}

export { PhonePeScreen }
