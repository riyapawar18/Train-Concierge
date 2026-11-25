import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/app/SessionProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { resolvePostLoginTarget, type AttemptedLocation } from '@/lib/navigation'
import { login, register } from './api'
import { FormAlert, PasswordField } from './FormBits'
import {
  authErrorMessage,
  isEmailTakenError,
  serverFieldErrors,
  type ServerFieldError,
} from './errors'
import {
  registerSchema,
  signInSchema,
  type RegisterValues,
  type SignInValues,
} from './schemas'

type AuthTab = 'signin' | 'register'
type RegisterField = 'fullName' | 'email' | 'mobile' | 'password' | 'confirmPassword'

const registerFields: RegisterField[] = [
  'fullName',
  'email',
  'mobile',
  'password',
  'confirmPassword',
]

interface AuthLocationState {
  from?: AttemptedLocation
}

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useSession()

  const activeTab: AuthTab = searchParams.get('tab') === 'register' ? 'register' : 'signin'
  const sessionExpired = searchParams.get('reason') === 'expired'

  const [signInError, setSignInError] = useState<string | null>(null)
  const [registerError, setRegisterError] = useState<string | null>(null)

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
    },
  })

  const selectTab = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'register') {
      next.set('tab', 'register')
    } else {
      next.delete('tab')
    }
    next.delete('reason')
    setSearchParams(next, { replace: true, state: location.state })
  }

  const applyServerErrors = (
    errors: ServerFieldError[],
    setError: (field: RegisterField, message: string) => void,
  ) => {
    for (const entry of errors) {
      setError(entry.field as RegisterField, entry.message)
    }
  }

  const handleSignIn = signInForm.handleSubmit(async (values) => {
    setSignInError(null)

    try {
      const result = await login({
        email: values.email.trim(),
        password: values.password,
      })
      signIn({ token: result.accessToken, user: result.user })

      const from = (location.state as AuthLocationState | null)?.from
      navigate(resolvePostLoginTarget(from, result.user.role), { replace: true })
    } catch (error) {
      const fieldErrors = serverFieldErrors(error, ['email', 'password'])
      if (fieldErrors.length > 0) {
        applyServerErrors(fieldErrors, (field, message) =>
          signInForm.setError(field as 'email' | 'password', { message }),
        )
        setSignInError(null)
        return
      }
      setSignInError(authErrorMessage(error))
    }
  })

  const handleRegister = registerForm.handleSubmit(async (values) => {
    setRegisterError(null)

    const email = values.email.trim()

    try {
      const result = await register({
        fullName: values.fullName.trim(),
        email,
        mobile: values.mobile.trim() || undefined,
        password: values.password,
        confirmPassword: values.confirmPassword,
      })

      signIn({ token: result.accessToken, user: result.user })
      const from = (location.state as AuthLocationState | null)?.from
      navigate(resolvePostLoginTarget(from, result.user.role), { replace: true })
    } catch (error) {
      if (isEmailTakenError(error)) {
        registerForm.setError('email', {
          message: 'An account with this email already exists.',
        })
        return
      }

      const fieldErrors = serverFieldErrors(error, registerFields)
      if (fieldErrors.length > 0) {
        applyServerErrors(fieldErrors, (field, message) =>
          registerForm.setError(field, { message }),
        )
        return
      }

      setRegisterError(authErrorMessage(error))
    }
  })

  const signInErrors = signInForm.formState.errors
  const registerErrors = registerForm.formState.errors
  const signInSubmitting = signInForm.formState.isSubmitting
  const registerSubmitting = registerForm.formState.isSubmitting

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent-orange uppercase">
          Welcome aboard
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {activeTab === 'signin' ? 'Sign in to your journey' : 'Create your account'}
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          {activeTab === 'signin'
            ? 'Pick up where you left off with live updates and recovery options in one place.'
            : 'A few details and your travel concierge is ready for the next disruption.'}
        </p>
      </div>

      {sessionExpired ? (
        <FormAlert tone="info" testId="session-expired">
          Your session has expired. Please sign in again to continue.
        </FormAlert>
      ) : null}

      <Tabs value={activeTab} onValueChange={selectTab}>
        <TabsList aria-label="Account access" className="w-full">
          <TabsTrigger value="signin" className="flex-1">
            Sign In
          </TabsTrigger>
          <TabsTrigger value="register" className="flex-1">
            Register
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signin">
          <form
            className="flex flex-col gap-4"
            aria-label="Sign in"
            noValidate
            onSubmit={handleSignIn}
          >
            <Input
              id="signin-email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              autoFocus
              error={signInErrors.email?.message}
              {...signInForm.register('email')}
            />
            <PasswordField
              id="signin-password"
              label="Password"
              autoComplete="current-password"
              error={signInErrors.password?.message}
              registration={signInForm.register('password')}
            />

            <div className="-mt-1 flex justify-end">
              <Link
                to="/auth/forgot-password"
                state={location.state}
                className="rounded-sm text-sm font-medium text-brand-navy underline-offset-4 transition-colors hover:text-brand-navy-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
              >
                Forgot password?
              </Link>
            </div>

            {signInError ? <FormAlert tone="error">{signInError}</FormAlert> : null}

            <Button
              type="submit"
              variant="cta"
              size="lg"
              className="w-full"
              disabled={signInSubmitting}
              aria-busy={signInSubmitting}
            >
              {signInSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form
            className="flex flex-col gap-4"
            aria-label="Register"
            noValidate
            onSubmit={handleRegister}
          >
            <Input
              id="register-full-name"
              label="Full name"
              autoComplete="name"
              placeholder="Asha Verma"
              autoFocus
              error={registerErrors.fullName?.message}
              {...registerForm.register('fullName')}
            />
            <Input
              id="register-email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              description="We'll email you about delays and seat availability."
              error={registerErrors.email?.message}
              {...registerForm.register('email')}
            />
            <Input
              id="register-mobile"
              label="Mobile number (optional)"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              placeholder="9876543210"
              description="Used only for urgent disruption alerts."
              error={registerErrors.mobile?.message}
              {...registerForm.register('mobile')}
            />
            <PasswordField
              id="register-password"
              label="Password"
              autoComplete="new-password"
              description="At least 4 characters."
              error={registerErrors.password?.message}
              registration={registerForm.register('password')}
            />
            <PasswordField
              id="register-confirm-password"
              label="Confirm password"
              autoComplete="new-password"
              error={registerErrors.confirmPassword?.message}
              registration={registerForm.register('confirmPassword')}
            />

            {registerError ? <FormAlert tone="error">{registerError}</FormAlert> : null}

            <Button
              type="submit"
              variant="cta"
              size="lg"
              className="w-full"
              disabled={registerSubmitting}
              aria-busy={registerSubmitting}
            >
              {registerSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
