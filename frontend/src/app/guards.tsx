import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { AccessDeniedPage } from '@/features/auth/AccessDeniedPage'
import {
  homeForRole,
  resolvePostLoginTarget,
  type AttemptedLocation,
} from '@/lib/navigation'
import type { UserRole } from '@/lib/session'
import { isSessionExpired } from '@/lib/tokenStorage'
import { SessionProvider, useSession } from './SessionProvider'

export function SessionRoot() {
  return (
    <SessionProvider>
      <Outlet />
    </SessionProvider>
  )
}

export function SessionLoading() {
  return (
    <div
      data-testid="session-loading"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-page"
    >
      <BrandMark size="md" />
      <p role="status" className="text-sm text-muted">
        Checking your session…
      </p>
    </div>
  )
}

export function RequireAnonymous() {
  const { status, user } = useSession()
  const location = useLocation()

  if (status === 'checking') {
    return <SessionLoading />
  }

  if (status === 'authenticated' && user) {
    const from = (location.state as { from?: AttemptedLocation } | null)?.from
    return <Navigate to={resolvePostLoginTarget(from, user.role)} replace />
  }

  return <Outlet />
}

export function RequireAuth() {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'checking') {
    return <SessionLoading />
  }

  if (status === 'anonymous') {
    const target = isSessionExpired() ? '/auth?reason=expired' : '/auth'
    return <Navigate to={target} replace state={{ from: location }} />
  }

  return <Outlet />
}

export function RequireRole({ role }: { role: UserRole }) {
  const { status, user } = useSession()

  if (status === 'checking') {
    return <SessionLoading />
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (user.role !== role) {
    if (role === 'ADMIN') {
      return <AccessDeniedPage />
    }
    return <Navigate to={homeForRole(user.role)} replace />
  }

  return <Outlet />
}
