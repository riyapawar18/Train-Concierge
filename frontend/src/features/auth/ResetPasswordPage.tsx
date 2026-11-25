import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { resetPassword } from './api'
import { FormAlert, PasswordField } from './FormBits'
import { authErrorMessage, serverFieldErrors } from './errors'
import { resetPasswordSchema, type ResetPasswordValues } from './schemas'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { toast } = useToast()

  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)

    try {
      await resetPassword({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      })
      setDone(true)
      form.reset()
      toast({
        tone: 'success',
        title: 'Password updated',
        description: 'You can sign in with your new password.',
      })
    } catch (caught) {
      const fieldErrors = serverFieldErrors(caught, ['token', 'password', 'confirmPassword'])
      if (fieldErrors.length > 0) {
        for (const entry of fieldErrors) {
          if (entry.field === 'token') {
            setError(entry.message)
            continue
          }
          form.setError(entry.field as 'password' | 'confirmPassword', { message: entry.message })
        }
        return
      }
      setError(authErrorMessage(caught))
    }
  })

  const errors = form.formState.errors
  const submitting = form.formState.isSubmitting

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-orange uppercase">
            All set
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Password changed</h1>
        </div>

        <FormAlert tone="info" testId="reset-done">
          <span className="flex gap-2.5">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span className="leading-relaxed">
              Your new password is active. Sign in to get back to your journeys.
            </span>
          </span>
        </FormAlert>

        <Button variant="cta" size="lg" className="w-full" asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-orange uppercase">
            Account recovery
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-text">This link is incomplete</h1>
        </div>

        <FormAlert tone="error" testId="reset-missing-token">
          Reset links open from the email we sent you. Please request a new one.
        </FormAlert>

        <Button variant="outline" className="w-full" asChild>
          <Link to="/auth/forgot-password">Request a new link</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-orange uppercase">
          Account recovery
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Choose a new password</h1>
        <p className="text-sm leading-relaxed text-muted">
          This link is tied to the account it was emailed to and can be used once.
        </p>
      </div>

      <form
        className="flex flex-col gap-4"
        aria-label="Choose a new password"
        noValidate
        onSubmit={handleSubmit}
      >
        <PasswordField
          id="reset-password"
          label="New password"
          autoComplete="new-password"
          description="At least 4 characters."
          error={errors.password?.message}
          registration={form.register('password')}
        />
        <PasswordField
          id="reset-confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          registration={form.register('confirmPassword')}
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
              Updating…
            </>
          ) : (
            'Update password'
          )}
        </Button>

        <Button variant="link" className="w-fit p-0" asChild>
          <Link to="/auth/forgot-password">Send me a new link</Link>
        </Button>
      </form>
    </div>
  )
}
