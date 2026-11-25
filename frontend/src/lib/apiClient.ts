import axios, { type AxiosRequestConfig } from 'axios'
import { clearToken, markSessionExpired, readToken } from './tokenStorage'

export interface ApiFieldError {
  field: string
  message: string
}

export interface NormalizedApiError extends Error {
  status: number
  code: string
  fieldErrors: ApiFieldError[]
}

interface ErrorLike {
  config?: { url?: string }
  response?: { status?: number; data?: unknown }
}

let unauthorizedHandler: (() => void) | null = null
let unauthorizedHandled = false

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export function resetUnauthorizedState(): void {
  unauthorizedHandled = false
}

export function triggerUnauthorized(): void {
  clearToken()
  markSessionExpired()
  if (unauthorizedHandled) {
    return
  }
  unauthorizedHandled = true
  unauthorizedHandler?.()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

export function isNormalizedApiError(value: unknown): value is NormalizedApiError {
  if (!(value instanceof Error)) {
    return false
  }
  const candidate = value as Partial<NormalizedApiError>
  return (
    typeof candidate.status === 'number' &&
    typeof candidate.code === 'string' &&
    Array.isArray(candidate.fieldErrors)
  )
}

function readFieldErrors(data: Record<string, unknown> | null): ApiFieldError[] {
  const raw = data?.fieldErrors
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.flatMap((item) => {
    if (!isRecord(item) || typeof item.field !== 'string' || typeof item.message !== 'string') {
      return []
    }
    return [{ field: item.field, message: item.message }]
  })
}

function readServerMessage(data: Record<string, unknown> | null): string | null {
  if (!data || typeof data.message !== 'string') {
    return null
  }
  const message = data.message.trim()
  return message.length > 0 && message.length <= 300 ? message : null
}

function defaultCode(status: number): string {
  switch (status) {
    case 0:
      return 'NETWORK_ERROR'
    case 400:
      return 'VALIDATION_ERROR'
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 429:
      return 'TOO_MANY_ATTEMPTS'
    default:
      return `HTTP_${status}`
  }
}

function messageFor(status: number, serverMessage: string | null): string {
  if (status === 0) {
    return 'We could not reach the server. Check your connection and try again.'
  }
  if (status >= 500) {
    return 'Something went wrong. Please try again.'
  }
  if (serverMessage) {
    return serverMessage
  }
  switch (status) {
    case 400:
      return 'Please check the highlighted fields.'
    case 401:
      return 'Your session has expired. Please sign in again.'
    case 403:
      return 'You do not have permission to do that.'
    case 404:
      return 'The requested item could not be found.'
    case 409:
      return 'That action conflicts with the current state.'
    case 429:
      return 'Too many attempts. Try again in a few minutes.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (isNormalizedApiError(error)) {
    return error
  }

  const candidate = (isRecord(error) ? error : {}) as ErrorLike
  const status =
    typeof candidate.response?.status === 'number' ? candidate.response.status : 0
  const data = isRecord(candidate.response?.data) ? candidate.response.data : null
  const serverMessage = status >= 500 ? null : readServerMessage(data)
  const normalized = new Error(messageFor(status, serverMessage)) as NormalizedApiError
  normalized.name = 'ApiError'
  normalized.status = status
  normalized.code =
    typeof data?.code === 'string' && data.code.trim().length > 0
      ? data.code
      : defaultCode(status)
  normalized.fieldErrors = readFieldErrors(data)
  return normalized
}

// Login, register and logout own their 401 responses; they must not trigger an expiry redirect.
function isAuthRequest(error: unknown): boolean {
  const url = (isRecord(error) ? (error as ErrorLike) : {}).config?.url ?? ''
  return (
    url.endsWith('/auth/login') ||
    url.endsWith('/auth/register') ||
    url.endsWith('/auth/logout')
  )
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 10_000,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = readToken()
  if (token && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalized = normalizeApiError(error)

    if (normalized.status === 401 && !isAuthRequest(error)) {
      triggerUnauthorized()
    }

    return Promise.reject(normalized)
  },
)

export const api = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.get<T>(url, config).then((response) => response.data)
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post<T>(url, data, config).then((response) => response.data)
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put<T>(url, data, config).then((response) => response.data)
  },
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.patch<T>(url, data, config).then((response) => response.data)
  },
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete<T>(url, config).then((response) => response.data)
  },
}
