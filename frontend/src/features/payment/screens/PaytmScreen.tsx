import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PAYER_UPI_ACCOUNTS, PAYTM_WALLET_BALANCE } from '../methods'
import { formatExact, initials, maskMobile } from '../transaction'
import type { MethodScreenProps } from '../types'
import { AppShell, Avatar, ChoiceRow, OtpBoxes, PayToBlock, useCountdown } from './shared'

const PAYTM_SKY = '#00b9f1'
const PAYTM_NAVY = '#002e5b'
const BANK_COLORS: Record<string, string> = {
  hdfc: '#004c8f',
  icici: '#f58220',
  sbi: '#22409a',
}

/** Two-second-tick clock as the app prints it, e.g. "0:09". */
function secondsLabel(value: number): string {
  return `0:${String(Math.max(0, value)).padStart(2, '0')}`
}

/**
 * Paytm sheet: wallet plus UPI-linked banks, then the six-digit OTP
 * the app sends to the registered mobile before debiting.
 */
function PaytmScreen({ subject, onPay, onCancel, error }: MethodScreenProps) {
  const [source, setSource] = useState<string>('wallet')
  const [otpStage, setOtpStage] = useState(false)
  const [otp, setOtp] = useState('')
  const { remaining, restart } = useCountdown(30, otpStage)

  const bank = PAYER_UPI_ACCOUNTS.find((account) => account.id === source)
  // Keep the wallet solvent however large the fare is.
  const walletBalance = Math.max(PAYTM_WALLET_BALANCE, subject.amount + 1000)
  const payerReference =
    source === 'wallet'
      ? `Paytm Wallet · balance ${formatExact(walletBalance)}`
      : `${bank?.bank ?? 'UPI'} · ${bank?.vpa ?? ''}`

  const backToChoose = () => setOtpStage(false)

  return (
    <AppShell
      onCancel={otpStage ? backToChoose : onCancel}
      headerStyle={{ background: PAYTM_SKY, color: '#ffffff' }}
      brand={<span className="text-[17px] font-semibold tracking-tight text-white">Paytm</span>}
      statusText={`Logged in as ${maskMobile(subject.payerMobile)} · paytm@trainconcierge`}
      footer={
        otpStage ? null : (
          <div className="flex flex-col gap-2">
            {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
            <Button
              className="w-full text-sm font-semibold"
              style={{ background: PAYTM_NAVY, color: '#ffffff' }}
              onClick={() => {
                setOtp('')
                setOtpStage(true)
              }}
            >
              Pay {formatExact(subject.amount)}
            </Button>
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Paytm Secure · encrypted checkout
            </p>
          </div>
        )
      }
    >
      {otpStage ? (
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="text-center">
            <p className="text-sm font-semibold text-text">
              Verification code sent to your registered mobile
            </p>
            <p className="mt-1 text-xs text-muted">{maskMobile(subject.payerMobile)}</p>
          </div>

          <OtpBoxes value={otp} onChange={setOtp} label="Paytm OTP" />

          <div className="text-xs text-muted">
            {remaining > 0 ? (
              <span>Resend code in {secondsLabel(remaining)}</span>
            ) : (
              <button
                type="button"
                onClick={() => restart()}
                className="font-medium underline-offset-2 hover:underline"
                style={{ color: PAYTM_SKY }}
              >
                Resend code
              </button>
            )}
          </div>

          <Button
            className="w-full text-sm font-semibold"
            style={{ background: PAYTM_NAVY, color: '#ffffff' }}
            disabled={otp.length !== 6}
            onClick={() =>
              onPay({ method: 'paytm', methodLabel: 'Paytm', payerReference })
            }
          >
            Verify &amp; Pay
          </Button>
          <Button variant="outline" className="w-full text-sm" onClick={backToChoose}>
            Use a different method
          </Button>
          <p className="text-[11px] text-muted">
            Enter the 6-digit OTP sent to your registered mobile.
          </p>
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
              Payment options
            </h3>
            <ChoiceRow
              selected={source === 'wallet'}
              onSelect={() => setSource('wallet')}
              title="Paytm Wallet"
              subtitle={`${formatExact(walletBalance)} available`}
              leading={<Avatar label="PT" color={PAYTM_NAVY} />}
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
        </div>
      )}
    </AppShell>
  )
}

export { PaytmScreen }
