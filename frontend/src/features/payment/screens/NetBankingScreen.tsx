import { useMemo, useState } from 'react'
import { ChevronRight, Info, Landmark, Lock, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NET_BANKING_CATALOG } from '../methods'
import { formatExact, generatePaymentReference, maskMobile } from '../transaction'
import type { MethodScreenProps } from '../types'
import type { NetBanking } from '../methods'
import { AppShell, Avatar, LabeledInput, PayToBlock } from './shared'

type Stage = 'choose' | 'signin' | 'review'

const USER_TYPES = ['Individual — login', 'Corporate — multi-user'] as const

/**
 * Net-banking journey: pick a bank, sign in on that bank's portal, then approve
 * the debit on the bank's own confirmation page. The session reference is
 * generated locally.
 */
function NetBankingScreen({ subject, onPay, onCancel, error }: MethodScreenProps) {
  const [stage, setStage] = useState<Stage>('choose')
  const [bank, setBank] = useState<NetBanking | null>(null)
  const [query, setQuery] = useState('')
  const [userType, setUserType] = useState<string>(USER_TYPES[0])
  const [customerId, setCustomerId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [reference] = useState(() => generatePaymentReference())

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return NET_BANKING_CATALOG.filter((entry) => entry.popular)
    return NET_BANKING_CATALOG.filter(
      (entry) =>
        entry.name.toLowerCase().includes(needle) || entry.short.toLowerCase().includes(needle),
    )
  }, [query])

  const openBank = (entry: NetBanking) => {
    setBank(entry)
    setStage('signin')
    setFormError(null)
  }

  const signIn = () => {
    if (customerId.trim().length < 6) {
      setFormError('Enter your net-banking customer ID (at least 6 characters).')
      return
    }
    if (password.length < 4) {
      setFormError('Enter your net-banking password (at least 4 characters).')
      return
    }
    setFormError(null)
    setStage('review')
  }

  return (
    <AppShell
      onCancel={stage === 'choose' ? onCancel : () => setStage(stage === 'review' ? 'signin' : 'choose')}
      headerStyle={
        bank && stage !== 'choose'
          ? { background: bank.color, color: '#ffffff' }
          : { background: '#0f766e', color: '#ffffff' }
      }
      brand={
        <span className="flex items-center gap-2 text-[15px] font-semibold text-white">
          <Landmark className="size-[18px]" aria-hidden="true" />
          {stage === 'choose'
            ? 'Net Banking'
            : `${bank?.short ?? 'Bank'} Online · Payment Services`}
        </span>
      }
      statusText={
        stage === 'choose'
          ? 'Choose your bank to continue'
          : `Session ${reference} · ${maskMobile(subject.payerMobile)} · Net Banking`
      }
      footer={
        stage === 'review' ? (
          <div className="flex flex-col gap-2">
            {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
            <Button
              className="w-full text-sm font-semibold"
              style={{ background: bank?.color ?? '#0f766e', color: '#ffffff' }}
              onClick={() =>
                onPay({
                  method: 'netbanking',
                  methodLabel: 'Net Banking',
                  payerReference: `${bank?.name ?? 'Bank'} · ref ${reference}`,
                })
              }
            >
              Confirm payment of {formatExact(subject.amount)}
            </Button>
          </div>
        ) : stage === 'signin' ? (
          <div className="flex flex-col gap-2">
            {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
            <Button
              className="w-full text-sm font-semibold"
              style={{ background: bank?.color ?? '#0f766e', color: '#ffffff' }}
              onClick={signIn}
            >
              Sign in to {bank?.name ?? 'your bank'}
            </Button>
          </div>
        ) : null
      }
    >
      {stage === 'choose' ? (
        <div className="flex flex-col gap-4">
          <PayToBlock merchant="TrainConcierge" note={subject.title} amount={subject.amount} />

          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3">
            <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your bank"
              aria-label="Search bank"
              className="h-10 w-full bg-transparent text-sm text-text focus:outline-none"
            />
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              {query.trim() ? `Results for “${query.trim()}”` : 'Popular banks'}
            </h3>
            {results.length === 0 ? (
              <p className="text-xs text-muted">
                No matching bank. Try “SBI”, “HDFC” or “ICICI”.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {results.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => openBank(entry)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
                    >
                      <Avatar label={entry.short.slice(0, 4)} color={entry.color} rounded="md" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text">
                          {entry.name}
                        </span>
                        <span className="block text-xs text-muted">
                          {entry.popular ? 'Popular · instant debit' : 'Retail and corporate'}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-[11px] text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Select the bank that holds your account. You will sign in and approve the debit
            from your net-banking session.
          </p>
        </div>
      ) : stage === 'signin' ? (
        <div className="flex flex-col gap-4">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
            style={{ background: `${bank?.color ?? '#0f766e'}14`, color: bank?.color ?? '#0f766e' }}
          >
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            Secure {bank?.name} net-banking sign-in
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nb-user-type" className="text-xs font-medium text-muted">
              User type
            </label>
            <select
              id="nb-user-type"
              value={userType}
              onChange={(event) => setUserType(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-brand-navy"
            >
              {USER_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <LabeledInput
            label="Customer ID / User ID"
            value={customerId}
            onChange={(next) => {
              setCustomerId(next)
              setFormError(null)
            }}
            placeholder="e.g. 8829104477"
            autoComplete="off"
            error={formError && customerId.trim().length < 6 ? formError : null}
          />

          <div className="flex flex-col gap-1">
            <label htmlFor="nb-password" className="text-xs font-medium text-muted">
              Password
            </label>
            <div className="flex items-center gap-2">
              <input
                id="nb-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setFormError(null)
                }}
                autoComplete="off"
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-brand-navy"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="h-9 shrink-0 rounded-lg border border-border px-2 text-xs font-medium text-muted hover:bg-surface-muted"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {formError && password.length < 4 ? (
              <p className="text-xs font-medium text-danger">{formError}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              setCustomerId('8829104477')
              setPassword('Bank@1234')
              setFormError(null)
            }}
            className="self-start text-xs font-medium text-brand-navy hover:underline"
          >
            Use saved credentials
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-text">Approve payment request</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Beneficiary</dt>
                <dd className="font-medium text-text">TrainConcierge</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Payee VPA / ID</dt>
                <dd className="font-mono text-xs text-text">SBI-TRCN-004477</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Debit account</dt>
                <dd className="text-text">{bank?.name} · A/C ****8842</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Bank reference</dt>
                <dd className="font-mono text-xs text-text">{reference}</dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-2 font-semibold">
                <dt className="text-text">Amount to pay</dt>
                <dd className="tabular-nums text-brand-navy">{formatExact(subject.amount)}</dd>
              </div>
            </dl>
          </div>

          <PayToBlock merchant={subject.title} note={subject.route} amount={subject.amount} />

          <p className="flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2 text-[11px] text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Review the debit, then confirm it to complete the payment from your
            {bank?.name} account.
          </p>
        </div>
      )}
    </AppShell>
  )
}

export { NetBankingScreen }
