import { AxiosError, type AxiosAdapter } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiClient,
  normalizeApiError,
  resetUnauthorizedState,
  setUnauthorizedHandler,
} from '@/lib/apiClient'
import { clearSessionExpired, clearToken, isSessionExpired } from '@/lib/tokenStorage'

function failingAdapter(status: number): AxiosAdapter {
  return async (config) => {
    const response = {
      data: {
        status,
        code: status === 401 ? 'UNAUTHORIZED' : 'SERVER_ERROR',
        message: 'java.lang.IllegalStateException at com.example.Internal',
      },
      status,
      statusText: 'Error',
      headers: {},
      config,
    }
    throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, response)
  }
}

beforeEach(() => {
  window.sessionStorage.clear()
  resetUnauthorizedState()
  setUnauthorizedHandler(null)
  clearToken()
  clearSessionExpired()
})

afterEach(() => {
  setUnauthorizedHandler(null)
})

describe('api client', () => {
  it('attaches the stored bearer token to requests', async () => {
    window.sessionStorage.setItem('trainconcierge.token', 'stored-token')
    let authorization: string | undefined

    const response = await apiClient.get<{ ok: boolean }>('/auth/me', {
      adapter: async (config) => {
        authorization = config.headers.get('Authorization') as string | undefined
        return {
          data: { ok: true },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }
      },
    })

    expect(authorization).toBe('Bearer stored-token')
    expect(response.data).toEqual({ ok: true })
  })

  it('clears the session and notifies once when protected requests return 401', async () => {
    window.sessionStorage.setItem('trainconcierge.token', 'expired-token')
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(
      apiClient.get('/auth/me', { adapter: failingAdapter(401) }),
    ).rejects.toMatchObject({ status: 401 })
    await expect(
      apiClient.get('/journeys', { adapter: failingAdapter(401) }),
    ).rejects.toMatchObject({ status: 401 })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem('trainconcierge.token')).toBeNull()
    expect(isSessionExpired()).toBe(true)
  })

  it('does not expire the session for failed sign-in attempts', async () => {
    window.sessionStorage.setItem('trainconcierge.token', 'kept-token')
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(
      apiClient.post('/auth/login', {}, { adapter: failingAdapter(401) }),
    ).rejects.toMatchObject({ status: 401 })

    expect(handler).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem('trainconcierge.token')).toBe('kept-token')
    expect(isSessionExpired()).toBe(false)
  })

  it('hides server internals behind a generic message', () => {
    const error = normalizeApiError({
      response: {
        status: 500,
        data: {
          status: 500,
          code: 'INTERNAL_ERROR',
          message: 'java.lang.IllegalStateException at com.example.Internal',
        },
      },
    })

    expect(error.message).toBe('Something went wrong. Please try again.')
    expect(error.message).not.toContain('IllegalStateException')
    expect(error.status).toBe(500)
  })

  it('normalizes network failures without exposing the URL', () => {
    const error = normalizeApiError(
      new Error('connect ECONNREFUSED http://localhost:8080/api/auth/login'),
    )

    expect(error.status).toBe(0)
    expect(error.message).toBe(
      'We could not reach the server. Check your connection and try again.',
    )
    expect(error.message).not.toContain('localhost')
    expect(error.message).not.toContain('/auth/login')
  })
})
