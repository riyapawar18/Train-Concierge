import { api } from '@/lib/apiClient'
import type { SessionUser } from '@/lib/session'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterDraft {
  fullName: string
  email: string
  mobile?: string
  password: string
  confirmPassword: string
}

export interface LoginResult {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
  user: SessionUser
}

export interface ResetDraft {
  token: string
  password: string
  confirmPassword: string
}

export function login(credentials: LoginCredentials): Promise<LoginResult> {
  return api.post<LoginResult>('/auth/login', credentials)
}

export function register(draft: RegisterDraft): Promise<LoginResult> {
  return api.post<LoginResult>('/auth/register', draft)
}

/** Resolves the recipient from the account behind this address, never from anything typed later. */
export function requestPasswordReset(email: string): Promise<void> {
  return api.post<void>('/auth/forgot-password', { email })
}

export function resetPassword(draft: ResetDraft): Promise<void> {
  return api.post<void>('/auth/reset-password', draft)
}

export function logout(token: string | null): Promise<void> {
  return api.post<void>(
    '/auth/logout',
    undefined,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  )
}
