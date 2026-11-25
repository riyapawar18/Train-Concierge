import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'

export interface StreamEvent {
  event: string
  data: unknown
}

export interface OpenEventStreamOptions {
  token: string
  url?: string
  signal?: AbortSignal
  onEvent: (event: StreamEvent) => void
  onReconnect?: () => void
  onUnauthorized?: () => void
  onError?: (error: unknown) => void
}

const INITIAL_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000
const MAX_BACKOFF_EXPONENT = 5

class UnauthorizedStreamError extends Error {}

function retryDelay(attempt: number): number {
  const base = Math.min(MAX_RETRY_MS, INITIAL_RETRY_MS * 2 ** Math.min(attempt, MAX_BACKOFF_EXPONENT))
  return Math.round(base * (1 + Math.random() * 0.2))
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }
    const finish = () => {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timer = window.setTimeout(finish, ms)
    signal.addEventListener('abort', finish, { once: true })
  })
}

function parseData(data: string): unknown {
  try {
    return JSON.parse(data) as unknown
  } catch {
    return data
  }
}

async function run(options: OpenEventStreamOptions, signal: AbortSignal): Promise<void> {
  let attempt = 0

  while (!signal.aborted) {
    let connected = false
    try {
      await fetchEventSource(options.url ?? '/api/stream', {
        method: 'GET',
        headers: {
          Accept: EventStreamContentType,
          Authorization: `Bearer ${options.token}`,
        },
        signal,
        openWhenHidden: true,
        onopen(response) {
          if (response.status === 401 || response.status === 403) {
            throw new UnauthorizedStreamError()
          }
          const contentType = response.headers.get('content-type') ?? ''
          if (!response.ok || !contentType.startsWith(EventStreamContentType)) {
            throw new Error('Live updates are unavailable.')
          }
          connected = true
          return Promise.resolve()
        },
        onmessage(message) {
          if (!message.event) {
            return
          }
          options.onEvent({ event: message.event, data: parseData(message.data) })
        },
        onclose() {
          throw new Error('The live update stream closed.')
        },
        onerror(error) {
          throw error
        },
      })
    } catch (error) {
      if (signal.aborted) {
        return
      }
      if (error instanceof UnauthorizedStreamError) {
        options.onUnauthorized?.()
        return
      }
      options.onError?.(error)
    }

    if (signal.aborted) {
      return
    }
    if (connected) {
      options.onReconnect?.()
    }
    attempt += 1
    await sleep(retryDelay(attempt), signal)
  }
}

/**
 * Keeps an authenticated server-sent events stream open until the returned function is
 * called or the optional signal aborts, reconnecting with capped exponential backoff.
 */
export function openEventStream(options: OpenEventStreamOptions): () => void {
  const controller = new AbortController()
  const abort = () => controller.abort()

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort()
    } else {
      options.signal.addEventListener('abort', abort, { once: true })
    }
  }

  void run(options, controller.signal)

  return () => {
    options.signal?.removeEventListener('abort', abort)
    controller.abort()
  }
}
