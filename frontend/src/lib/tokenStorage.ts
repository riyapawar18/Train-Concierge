import { storage } from './storage'

export const TOKEN_STORAGE_KEY = 'trainconcierge.token'

let sessionExpired = false

export function readToken(): string | null {
  return storage.get(TOKEN_STORAGE_KEY, 'session')
}

export function writeToken(token: string): void {
  storage.set(TOKEN_STORAGE_KEY, token, 'session')
}

export function clearToken(): void {
  storage.remove(TOKEN_STORAGE_KEY, 'session')
}

export function markSessionExpired(): void {
  sessionExpired = true
}

export function isSessionExpired(): boolean {
  return sessionExpired
}

export function clearSessionExpired(): void {
  sessionExpired = false
}
