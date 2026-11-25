import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowLeft, Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatExact } from '../transaction'

/**
 * Shared chrome for the payment-app screens. Brand colours are inline styles
 * because they are data-driven, not part of the design tokens.
 */

export interface AppShellProps {
  onCancel: () => void
  /** Brand mark shown in the header. */
  brand: ReactNode
  headerStyle?: CSSProperties
  /** Small line under the header, e.g. the masked logged-in mobile number. */
  statusText?: string
  statusTone?: 'light' | 'dark'
  children: ReactNode
  footer?: ReactNode
}

export function AppShell({
  onCancel,
  brand,
  headerStyle,
  statusText,
  statusTone = 'light',
  children,
  footer,
}: AppShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className="flex shrink-0 items-center gap-2 px-3 py-2.5"
        style={headerStyle}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Leave this payment method"
          className="grid size-8 shrink-0 place-items-center rounded-full transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <ArrowLeft className="size-[18px]" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">{brand}</div>
      </header>

      {statusText ? (
        <p
          className={`shrink-0 px-4 py-1.5 text-[11px] ${
            statusTone === 'dark' ? 'text-white/70' : 'text-muted'
          }`}
          style={statusTone === 'dark' ? undefined : { color: 'var(--muted)' }}
        >
          {statusText}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>

      {footer ? (
        <div className="shrink-0 border-t border-border bg-surface px-4 py-3">{footer}</div>
      ) : null}
    </div>
  )
}

export function PayToBlock({
  merchant,
  note,
  amount,
  align = 'left',
}: {
  merchant: string
  note?: string
  amount: number
  align?: 'left' | 'center'
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-border bg-surface-muted/60 px-3 py-3 ${
        align === 'center' ? 'flex-col text-center' : ''
      }`}
    >
      <div className={`min-w-0 flex-1 ${align === 'center' ? 'text-center' : ''}`}>
        <p className="truncate text-sm font-semibold text-text">{merchant}</p>
        {note ? <p className="mt-0.5 truncate text-xs text-muted">{note}</p> : null}
      </div>
      <p className="shrink-0 text-xl font-bold text-brand-navy tabular-nums">
        {formatExact(amount)}
      </p>
    </div>
  )
}

export interface ChoiceRowProps {
  selected: boolean
  onSelect: () => void
  title: string
  subtitle?: string
  leading?: ReactNode
  trailing?: ReactNode
  disabled?: boolean
}

export function ChoiceRow({
  selected,
  onSelect,
  title,
  subtitle,
  leading,
  trailing,
  disabled,
}: ChoiceRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
        selected
          ? 'border-brand-navy bg-brand-navy/5 ring-1 ring-brand-navy/25'
          : 'border-border bg-surface hover:bg-surface-muted'
      }`}
    >
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-muted">{subtitle}</span>
        ) : null}
      </span>
      {trailing}
      <span
        aria-hidden="true"
        className={`grid size-4 shrink-0 place-items-center rounded-full border ${
          selected ? 'border-brand-navy bg-brand-navy' : 'border-border'
        }`}
      >
        {selected ? <span className="size-1.5 rounded-full bg-white" /> : null}
      </span>
    </button>
  )
}

export function Avatar({
  label,
  color,
  textColor = '#ffffff',
  size = 36,
  rounded = 'full',
}: {
  label: string
  color: string
  textColor?: string
  size?: number
  rounded?: 'full' | 'md'
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center text-[11px] font-bold ${
        rounded === 'full' ? 'rounded-full' : 'rounded-md'
      }`}
      style={{
        width: size,
        height: size,
        background: color,
        color: textColor,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </span>
  )
}

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export interface PinPadProps {
  title: string
  hint?: string
  length: number
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  submitLabel: string
  error?: string | null
  note?: ReactNode
}

/** On-screen numeric pad, like the one a payment app raises for a PIN. */
export function PinPad({
  title,
  hint,
  length,
  value,
  onChange,
  onSubmit,
  submitLabel,
  error,
  note,
}: PinPadProps) {
  const press = (digit: string) => {
    if (value.length < length) onChange(`${value}${digit}`)
  }
  const full = value.length === length

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="text-center">
        <p className="text-sm font-semibold text-text">{title}</p>
        {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      </div>

      <div className="flex gap-3" role="group" aria-label={`${length}-digit code`}>
        {Array.from({ length }, (_cell, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`size-3 rounded-full border ${
              value.length > index
                ? 'border-brand-navy bg-brand-navy'
                : 'border-border bg-surface'
            }`}
          />
        ))}
      </div>

      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}

      <div className="grid w-full max-w-[240px] grid-cols-3 gap-2">
        {KEYPAD.map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => press(digit)}
            className="h-12 rounded-lg border border-border bg-surface text-base font-semibold text-text tabular-nums transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            {digit}
          </button>
        ))}
        <span aria-hidden="true" />
        <button
          type="button"
          onClick={() => press('0')}
          className="h-12 rounded-lg border border-border bg-surface text-base font-semibold text-text tabular-nums transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          aria-label="Delete last digit"
          className="grid h-12 place-items-center rounded-lg border border-border bg-surface text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          <Delete className="size-[18px]" aria-hidden="true" />
        </button>
      </div>

      <Button variant="cta" className="w-full max-w-[240px]" disabled={!full} onClick={onSubmit}>
        {submitLabel}
      </Button>
      {note}
    </div>
  )
}

export function OtpBoxes({
  length = 6,
  value,
  onChange,
  label = 'One-time password',
}: {
  length?: number
  value: string
  onChange: (next: string) => void
  label?: string
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const id = useId()

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="flex justify-center gap-2">
        {Array.from({ length }, (_cell, index) => (
          <input
            key={`${id}-${index}`}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={`${label} digit ${index + 1}`}
            maxLength={1}
            value={value[index] ?? ''}
            onChange={(event) => {
              const digit = event.target.value.replace(/\D/g, '').slice(-1)
              if (!digit) return
              const next = value.slice(0, index) + digit
              onChange(next.slice(0, length))
              if (index + 1 < length) refs.current[index + 1]?.focus()
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace' && !event.currentTarget.value && index > 0) {
                onChange(value.slice(0, -1))
                refs.current[index - 1]?.focus()
              }
            }}
            onPaste={(event) => {
              const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
              if (digits) {
                event.preventDefault()
                onChange(digits)
                refs.current[Math.min(digits.length, length - 1)]?.focus()
              }
            }}
            className="size-11 rounded-lg border border-border bg-surface text-center text-lg font-semibold text-text tabular-nums focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Runs `action` once after `delayMs`, whenever `active` turns true. The latest
 * callback is used even if the parent re-renders, so the timer never restarts.
 */
export function useDelayedAction(action: () => void, delayMs: number, active: boolean): void {
  const actionRef = useRef(action)
  useEffect(() => {
    actionRef.current = action
  })

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => actionRef.current(), delayMs)
    return () => window.clearTimeout(timer)
  }, [active, delayMs])
}

export function useCountdown(seconds: number, start = true): { remaining: number; restart: () => void } {
  const [remaining, setRemaining] = useState(seconds)
  const [seed, setSeed] = useState(0)

  useEffect(() => {
    if (!start) return
    setRemaining(seconds)
  }, [seconds, seed, start])

  useEffect(() => {
    if (!start || remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining, start])

  return { remaining, restart: () => setSeed((current) => current + 1) }
}

export function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = 'text',
  inputMode,
  maxLength,
  autoComplete,
  suffix,
  disabled,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  error?: string | null
  type?: string
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  maxLength?: number
  autoComplete?: string
  suffix?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`h-10 w-full rounded-lg border bg-surface px-3 text-sm text-text placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-navy disabled:opacity-60 ${
            error ? 'border-danger' : 'border-border'
          }`}
        />
        {suffix}
      </div>
      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </div>
  )
}
