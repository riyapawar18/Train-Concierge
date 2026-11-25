import type { UserRole } from './session'

export function homeForRole(role: UserRole): string {
  return role === 'ADMIN' ? '/admin/dashboard' : '/app/dashboard'
}

export function pathMatchesRole(pathname: string, role: UserRole): boolean {
  const prefix = role === 'ADMIN' ? '/admin' : '/app'
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export interface AttemptedLocation {
  pathname: string
  search?: string
}

export function resolvePostLoginTarget(
  from: AttemptedLocation | null | undefined,
  role: UserRole,
): string {
  if (from && pathMatchesRole(from.pathname, role)) {
    return `${from.pathname}${from.search ?? ''}`
  }
  return homeForRole(role)
}
