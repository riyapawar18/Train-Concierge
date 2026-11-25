import { useState } from 'react'
import { Check, CreditCard, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatExact, isExpiryValid, maskCard, maskMobile, detectCardBrand, formatCardNumber, formatExpiry, passesLuhn } from '../transaction'
import type { MethodScreenProps } from '../types'
import { AppShell, LabeledInput, OtpBoxes, PayToBlock, useCountdown } from './shared'

const CARD_INK = '#14213d'

const SAMPLE_CARD = '4111 1111 1111 1111'

interface CardErrors {
  number?: string
  name?: string
  expiry?: string
  cvv?: string
}

function clockLabel(seconds: number): string {
  return `0:${String(Math.max(0, seconds)).padStart(2, '0')}`
}

/**
 * Card payment: card capture with brand detection and a Luhn check,
 * then the issuer's 3-D Secure OTP step-up.
 */
function CardScreen({ subject, onPay, onCancel, error }: MethodScreenProps) {
  const [number, setNumber] = useState('')
  const [name, setName] = useState(subject.payerName)
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [revealCvv, setRevealCvv] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [errors, setErrors] = useState<CardErrors>({})
  const [threeDs, setThreeDs] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const { remaining, restart } = useCountdown(30, threeDs)

  const brand = detectCardBrand(number)
  const digits = number.replace(/\D/g, '')

  const validate = (): CardErrors => {
    const next: CardErrors = {}
    const allowedLengths = brand?.lengths ?? [16]
    if (!allowedLengths.includes(digits.length)) {
      next.number = `Enter a valid ${brand?.label ?? 'card'} number (${allowedLengths.join(' or ')} digits).`
    } else if (!passesLuhn(digits)) {
      next.number = 'This card number failed the checksum. Use the sample card below.'
    }
    if (name.trim().length < 3) next.name = 'Enter the name printed on the card.'
    if (!isExpiryValid(expiry)) next.expiry = 'Enter a future expiry as MM/YY.'
    const cvvLength = brand?.cvvLength ?? 3
    if (cvv.length !== cvvLength) next.cvv = `CVV must be ${cvvLength} digits.`
    return next
  }

  const payerReference = `${brand?.label ?? 'Card'} ${maskCard(digits)}`

  return (
    <AppShell
      onCancel={threeDs ? () => setThreeDs(false) : onCancel}
      headerStyle={{ background: CARD_INK, color: '#ffffff' }}
      brand={
        <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
          <CreditCard className="size-[18px]" aria-hidden="true" />
          Card payment
        </span>
      }
      statusText="Visa · Mastercard · RuPay · American Express accepted"
      footer={
        threeDs ? null : (
          <div className="flex flex-col gap-2">
            {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
            <Button
              className="w-full text-sm font-semibold"
              style={{ background: CARD_INK, color: '#ffffff' }}
              onClick={() => {
                const found = validate()
                setErrors(found)
                if (Object.keys(found).length === 0) {
                  setOtp('')
                  setOtpError(null)
                  setThreeDs(true)
                }
              }}
            >
              Pay {formatExact(subject.amount)} securely
            </Button>
          </div>
        )
      }
    >
      {threeDs ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-text">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" />
              Verified by {brand?.label ?? 'your bank'}
            </p>
            <p className="mt-2 text-xs text-muted">
              {subject.payerName} · {maskCard(digits)} · {formatExact(subject.amount)} to
              TrainConcierge
            </p>
            <p className="mt-1 text-xs text-muted">
              One-time password sent to the mobile registered with your bank ({maskMobile(subject.payerMobile)}).
            </p>

            <div className="mt-3 flex flex-col gap-3">
              <OtpBoxes value={otp} onChange={setOtp} label="3-D Secure OTP" />
              {otpError ? <p className="text-xs font-medium text-danger">{otpError}</p> : null}
              <p className="text-xs text-muted tabular-nums">
                {remaining > 0 ? `Resend OTP in ${clockLabel(remaining)}` : ''}
              </p>
              {remaining <= 0 ? (
                <button
                  type="button"
                  onClick={() => restart()}
                  className="self-start text-xs font-semibold text-brand-navy hover:underline"
                >
                  Resend OTP
                </button>
              ) : null}
              <Button
                className="w-full text-sm font-semibold"
                style={{ background: CARD_INK, color: '#ffffff' }}
                disabled={otp.length !== 6}
                onClick={() => {
                  if (otp.length !== 6) {
                    setOtpError('Enter the 6-digit OTP sent by your bank.')
                    return
                  }
                  onPay({ method: 'card', methodLabel: 'Debit / Credit Card', payerReference })
                }}
              >
                Authenticate &amp; Pay
              </Button>
              <p className="text-[11px] text-muted">
                Your bank verifies this payment before the debit is sent.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Card visual */}
          <div style={{ perspective: '900px' }}>
            <div
              className="relative h-[172px] w-full transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              <div
                className="absolute inset-0 flex flex-col justify-between rounded-2xl p-4 text-white shadow-card"
                style={{
                  backfaceVisibility: 'hidden',
                  background: 'linear-gradient(135deg, #1e3a6e 0%, #14213d 60%, #0b1f4b 100%)',
                }}
              >
                <div className="flex items-start justify-between">
                  <span className="h-8 w-11 rounded-md" style={{ background: '#e8c56a' }} aria-hidden="true" />
                  <span className="text-xs font-semibold tracking-wide uppercase opacity-90">
                    {brand?.label ?? 'Card'}
                  </span>
                </div>
                <p className="font-mono text-lg tracking-[0.12em]">
                  {number || '•••• •••• •••• ••••'}
                </p>
                <div className="flex items-end justify-between text-xs">
                  <span className="truncate font-medium uppercase">
                    {name || 'CARDHOLDER NAME'}
                  </span>
                  <span className="font-mono tabular-nums">{expiry || 'MM/YY'}</span>
                </div>
              </div>

              <div
                className="absolute inset-0 flex flex-col gap-3 rounded-2xl p-4 text-white shadow-card"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: 'linear-gradient(135deg, #0b1f4b 0%, #14213d 100%)',
                }}
              >
                <span className="mt-2 h-9 w-full rounded" style={{ background: '#0a0d16' }} aria-hidden="true" />
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 flex-1 items-center justify-end rounded-l px-2 font-mono text-xs text-brand-navy"
                    style={{ background: '#f3f5f9' }}
                  >
                    {revealCvv ? cvv || '•••' : cvv ? '•'.repeat(cvv.length) : ''}
                  </span>
                  <span className="text-[10px] uppercase opacity-80">CVV</span>
                </div>
                <p className="text-[10px] opacity-70">
                  TrainConcierge secure card checkout
                </p>
              </div>
            </div>
          </div>

          <PayToBlock merchant="TrainConcierge" note={subject.title} amount={subject.amount} />

          <div className="flex flex-col gap-3">
            <LabeledInput
              label="Card number"
              value={number}
              onChange={(next) => {
                setNumber(formatCardNumber(next))
                setErrors((current) => ({ ...current, number: undefined }))
              }}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4111 1111 1111 1111"
              error={errors.number}
              suffix={
                brand ? (
                  <span className="shrink-0 rounded bg-surface-muted px-2 py-1 text-[10px] font-semibold text-brand-navy uppercase">
                    {brand.label}
                  </span>
                ) : null
              }
            />
            <LabeledInput
              label="Name on card"
              value={name}
              onChange={(next) => {
                setName(next)
                setErrors((current) => ({ ...current, name: undefined }))
              }}
              autoComplete="cc-name"
              placeholder="As printed on the card"
              error={errors.name}
            />
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label="Expiry"
                value={expiry}
                onChange={(next) => {
                  setExpiry(formatExpiry(next))
                  setErrors((current) => ({ ...current, expiry: undefined }))
                }}
                inputMode="numeric"
                autoComplete="cc-exp"
                maxLength={5}
                placeholder="MM/YY"
                error={errors.expiry}
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="card-cvv" className="text-xs font-medium text-muted">
                  CVV
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="card-cvv"
                    type={revealCvv ? 'text' : 'password'}
                    value={cvv}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={brand?.cvvLength ?? 4}
                    onFocus={() => setFlipped(true)}
                    onBlur={() => setFlipped(false)}
                    onChange={(event) => {
                      setCvv(event.target.value.replace(/\D/g, ''))
                      setErrors((current) => ({ ...current, cvv: undefined }))
                    }}
                    aria-invalid={errors.cvv ? true : undefined}
                    className={`h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-brand-navy ${
                      errors.cvv ? 'border-danger' : 'border-border'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setRevealCvv((current) => !current)}
                    aria-label={revealCvv ? 'Hide CVV' : 'Show CVV'}
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted hover:bg-surface-muted"
                  >
                    {revealCvv ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
                {errors.cvv ? <p className="text-xs font-medium text-danger">{errors.cvv}</p> : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setNumber(SAMPLE_CARD)
                setExpiry('04/31')
                setCvv('123')
                setErrors({})
              }}
              className="flex items-center gap-1.5 self-start text-xs font-medium text-brand-navy hover:underline"
            >
              <Check className="size-3.5" aria-hidden="true" />
              Autofill card details
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}

export { CardScreen }
