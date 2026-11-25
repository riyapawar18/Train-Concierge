import { api } from './apiClient'
import { clearToken, readToken, TOKEN_STORAGE_KEY, writeToken } from './tokenStorage'

export { clearToken, readToken, TOKEN_STORAGE_KEY, writeToken }

export type UserRole = 'PASSENGER' | 'ADMIN'

export interface SessionUser {
  id: number
  fullName: string
  email: string
  role: UserRole
}

export function isUserRole(value: unknown): value is UserRole {
  return value === 'PASSENGER' || value === 'ADMIN'
}

export function isSessionUser(value: unknown): value is SessionUser {
  if (value === null || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'number' &&
    Number.isFinite(candidate.id) &&
    typeof candidate.fullName === 'string' &&
    candidate.fullName.trim().length > 0 &&
    typeof candidate.email === 'string' &&
    candidate.email.length > 0 &&
    isUserRole(candidate.role)
  )
}

export async function fetchCurrentUser(): Promise<SessionUser | null> {
  if (!readToken()) {
    return null
  }

  try {
    const user: unknown = await api.get('/auth/me')
    if (!isSessionUser(user)) {
      clearToken()
      return null
    }
    return user
  } catch {
    return null
  }
}
