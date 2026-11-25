import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openEventStream } from '../sse'

vi.mock('@microsoft/fetch-event-source', () => ({
  EventStreamContentType: 'text/event-stream',
  fetchEventSource: vi.fn(),
}))

const mockFetchEventSource = vi.mocked(fetchEventSource)
type StreamInit = NonNullable<Parameters<typeof fetchEventSource>[1]>

function streamResponse(status = 200): Response {
  return new Response(null, {
    status,
    headers: { 'content-type': EventStreamContentType },
  })
}

function emitMessage(init: StreamInit, event: string, data: string) {
  init.onmessage?.({ id: '1', event, data })
}

beforeEach(() => {
  vi.useFakeTimers()
  mockFetchEventSource.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('openEventStream', () => {
  it('opens the stream with the bearer token and delivers parsed events', async () => {
    const onEvent = vi.fn()
    mockFetchEventSource.mockImplementation(async (_url, init) => {
      await init.onopen?.(streamResponse())
      emitMessage(init, 'notification', '{"unreadCount":3}')
      emitMessage(init, 'seat_update', 'not-json')
    })

    const close = openEventStream({ token: 'token-9', onEvent })
    await vi.advanceTimersByTimeAsync(0)

    expect(mockFetchEventSource).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetchEventSource.mock.calls[0]
    expect(url).toBe('/api/stream')
    expect(init?.headers).toMatchObject({
      Accept: 'text/event-stream',
      Authorization: 'Bearer token-9',
    })
    expect(onEvent).toHaveBeenCalledWith({ event: 'notification', data: { unreadCount: 3 } })
    expect(onEvent).toHaveBeenCalledWith({ event: 'seat_update', data: 'not-json' })
    expect(onEvent).toHaveBeenCalledTimes(2)

    close()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1)
  })

  it('reports an unauthorized stream and stops without retrying', async () => {
    const onUnauthorized = vi.fn()
    const onEvent = vi.fn()
    mockFetchEventSource.mockImplementation(async (_url, init) => {
      await init.onopen?.(streamResponse(401))
    })

    const close = openEventStream({ token: 'bad', onEvent, onUnauthorized })
    await vi.advanceTimersByTimeAsync(0)

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(onEvent).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(60_000)
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1)
    close()
  })

  it('reconnects with backoff after a dropped connection', async () => {
    const onReconnect = vi.fn()
    const onEvent = vi.fn()
    let calls = 0
    mockFetchEventSource.mockImplementation(async (_url, init) => {
      calls += 1
      await init.onopen?.(streamResponse())
      if (calls === 1) {
        throw new Error('connection lost')
      }
      emitMessage(init, 'notification', '{"unreadCount":1}')
      await new Promise(() => {})
    })

    const close = openEventStream({ token: 'token-1', onEvent, onReconnect })
    await vi.advanceTimersByTimeAsync(0)
    expect(onReconnect).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(mockFetchEventSource).toHaveBeenCalledTimes(2)
    expect(onEvent).toHaveBeenCalledWith({ event: 'notification', data: { unreadCount: 1 } })
    expect(onReconnect).toHaveBeenCalledTimes(1)

    close()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(mockFetchEventSource).toHaveBeenCalledTimes(2)
  })

  it('keeps retrying with capped backoff until closed', async () => {
    const onError = vi.fn()
    mockFetchEventSource.mockRejectedValue(new Error('network down'))

    const close = openEventStream({ token: 'token-1', onEvent: vi.fn(), onError })
    await vi.advanceTimersByTimeAsync(0)
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(7_000)
    expect(mockFetchEventSource.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(onError).toHaveBeenCalled()

    close()
    const callsAfterClose = mockFetchEventSource.mock.calls.length
    await vi.advanceTimersByTimeAsync(120_000)
    expect(mockFetchEventSource).toHaveBeenCalledTimes(callsAfterClose)
  })

  it('aborts the underlying request when closed', async () => {
    mockFetchEventSource.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )

    const close = openEventStream({ token: 'token-1', onEvent: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1)

    close()
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(mockFetchEventSource).toHaveBeenCalledTimes(1)
  })
})
