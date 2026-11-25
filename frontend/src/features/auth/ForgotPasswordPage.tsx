import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestPasswordReset } from './api'
import { FormAlert } from './FormBits'
import { authErrorMessage, serverFieldErrors } from './errors'
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas'

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)
    const email = values.email.trim()

    try {
      await requestPasswordReset(email)
      setSentTo(email)
    } catch (caught) {
      const fieldErrors = serverFieldErrors(caught, ['email'])
      if (fieldErrors.length > 0) {
        for (const entry of fieldErrors) {
          form.setError('email', { message: entry.message })
        }
        return
      }
      setError(authErrorMessage(caught))
    }
  })

  const errors = form.formState.errors
  const submitting = form.formState.isSubmitting

  if (sentTo) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-orange uppercase">
            Almost there
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Check your inbox</h1>
        </div>

        <FormAlert tone="info" testId="reset-sent">
          <span className="flex gap-2.5">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-brand-navy" aria-hidden="true" />
            <span className="leading-relaxed">
              If an account uses <span className="font-medium">{sentTo}</span>, a reset link is on
              its way. The link works once and expires after a short while — check your spam folder
              if it does not arrive.
            </span>
          </span>
        </FormAlert>

        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
          <Button variant="link" className="w-fit p-0" asChild>
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-orange uppercase">
          Account recovery
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Reset your password</h1>
        <p className="text-sm leading-relaxed text-muted">
          Enter the email address on your account and we will send a link to choose a new password.
        </p>
      </div>

      <form className="flex flex-col gap-4" aria-label="Reset your password" noValidate onSubmit={handleSubmit}>
        <Input
          id="forgot-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus
          error={errors.email?.message}
          {...form.register('email')}
        />

        {error ? <FormAlert tone="error">{error}</FormAlert> : null}

        <Button
          type="submit"
          variant="cta"
          size="lg"
          className="w-full"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Sending link…
            </>
          ) : (
            'Email me a reset link'
          )}
        </Button>

        <Button variant="link" className="w-fit p-0" asChild>
          <Link to="/auth">Back to sign in</Link>
        </Button>
      </form>
    </div>
  )
}
