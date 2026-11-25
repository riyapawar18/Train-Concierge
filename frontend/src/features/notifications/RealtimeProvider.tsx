import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/SessionProvider'
import { getMyDisruptions } from '@/features/disruptions/api'
import type { PassengerDisruption } from '@/features/disruptions/types'
import { formatDuration } from '@/features/travel/constants'
import { triggerUnauthorized } from '@/lib/apiClient'
import { registerSessionCleanup } from '@/lib/sessionCleanup'
import { openEventStream } from '@/lib/sse'
import { acknowledgeDisruption, isDisruptionAcknowledged } from './ack'
import type { DisruptionPrompt, UnreadCount } from './types'

export const DISRUPTION_QUERY_KEYS: ReadonlyArray<readonly string[]> = [
  ['journeys'],
  ['journeys-summary'],
  ['journey'],
  ['my-disruptions'],
  ['my-disruption'],
  ['journey-impact'],
  ['journey-recommendations'],
  ['train-status'],
  ['booking'],
]

export const SEAT_QUERY_KEYS: ReadonlyArray<readonly string[]> = [
  ['availability'],
  ['coaches'],
  ['seats'],
  ['charts-availability'],
  ['train-search'],
  ['train-status'],
]

interface RealtimeContextValue {
  prompt: DisruptionPrompt | null
  queuedCount: number
  dismissPrompt: () => void
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function promptFromStreamEvent(userId: number, data: unknown): DisruptionPrompt | null {
  if (!isRecord(data)) {
    return null
  }
  const disruptionId = readNumber(data.disruptionId)
  const journeyId = readNumber(data.journeyId)
  if (disruptionId === null || journeyId === null) {
    return null
  }
  const type = data.type === 'CANCELLATION' ? 'CANCELLATION' : 'DELAY'
  const severity =
    data.severity === 'HIGH' || data.severity === 'LOW' ? data.severity : 'MEDIUM'
  const trainNumber = readString(data.trainNumber) ?? ''
  const trainName = readString(data.trainName) ?? 'Your train'
  const title =
    readString(data.title) ??
    (type === 'CANCELLATION'
      ? `Train ${trainNumber} has been cancelled`
      : `Train ${trainNumber} is delayed`)
  return {
    key: `${userId}:${disruptionId}`,
    disruptionId,
    journeyId,
    notificationId: readNumber(data.notificationId),
    type,
    severity,
    title,
    body: readString(data.body) ?? '',
    trainNumber,
    trainName,
    delayMinutes: readNumber(data.delayMinutes),
    newArrival: readString(data.newArrival),
    linkPath: readString(data.linkPath) ?? `/app/recovery?journey=${journeyId}`,
    active: data.active !== false,
  }
}

function promptFromDisruption(userId: number, item: PassengerDisruption): DisruptionPrompt {
  const delay = item.delayMinutes ?? 0
  return {
    key: `${userId}:${item.id}`,
    disruptionId: item.id,
    journeyId: item.journeyId,
    notificationId: null,
    type: item.type,
    severity: item.severity,
    title:
      item.type === 'CANCELLATION'
        ? `Train ${item.trainNumber} has been cancelled`
        : `Train ${item.trainNumber} is delayed by ${formatDuration(delay)}`,
    body: item.summary,
    trainNumber: item.trainNumber,
    trainName: item.trainName,
    delayMinutes: item.delayMinutes,
    newArrival: item.newArrival,
    linkPath: `/app/recovery?journey=${item.journeyId}`,
    active: item.status === 'ACTIVE',
  }
}

function readUnreadCount(data: unknown): number | null {
  if (!isRecord(data)) {
    return null
  }
  const count = readNumber(data.unreadCount)
  return count === null ? null : count
}

function RealtimeProvider({ children }: { children: ReactNode }) {
  const { status, token, user } = useSession()
  const queryClient = useQueryClient()
  const userId = user?.id ?? null
  const [queue, setQueue] = useState<DisruptionPrompt[]>([])

  const enqueuePrompt = useCallback((prompt: DisruptionPrompt | null) => {
    if (!prompt || !prompt.active || isDisruptionAcknowledged(prompt.key)) {
      return
    }
    setQueue((current) =>
      current.some((item) => item.key === prompt.key) ? current : [...current, prompt],
    )
  }, [])

  const dismissPrompt = useCallback(() => {
    setQueue((current) => {
      const [first, ...rest] = current
      if (first) {
        acknowledgeDisruption(first.key)
      }
      return rest
    })
  }, [])

  const invalidate = useCallback(
    (keys: ReadonlyArray<readonly string[]>) => {
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey: [...queryKey] })
      }
    },
    [queryClient],
  )

  const activeDisruptions = useQuery({
    queryKey: ['my-disruptions', 'ACTIVE'],
    queryFn: () => getMyDisruptions('ACTIVE'),
    enabled: status === 'authenticated',
  })

  useEffect(() => {
    if (!userId || !activeDisruptions.data) {
      return
    }
    for (const item of activeDisruptions.data) {
      enqueuePrompt(promptFromDisruption(userId, item))
    }
  }, [activeDisruptions.data, enqueuePrompt, userId])

  useEffect(() => {
    if (status !== 'authenticated' || !token || !userId) {
      setQueue([])
      return
    }

    const close = openEventStream({
      token,
      onEvent: ({ event, data }) => {
        switch (event) {
          case 'notification': {
            const unread = readUnreadCount(data)
            if (unread !== null) {
              queryClient.setQueryData<UnreadCount>(['notifications-unread'], { count: unread })
            }
            void queryClient.invalidateQueries({ queryKey: ['notifications'] })
            break
          }
          case 'disruption': {
            enqueuePrompt(promptFromStreamEvent(userId, data))
            invalidate(DISRUPTION_QUERY_KEYS)
            void queryClient.invalidateQueries({ queryKey: ['notifications'] })
            break
          }
          case 'journey':
          case 'payment': {
            invalidate([
              ['journeys'],
              ['journeys-summary'],
              ['journey'],
              ['booking'],
            ])
            break
          }
          case 'seat_update': {
            invalidate(SEAT_QUERY_KEYS)
            break
          }
          case 'hotel': {
            invalidate([['hotels'], ['hotel-booking'], ['journey'], ['journeys']])
            break
          }
          default:
            break
        }
      },
      onReconnect: () => {
        invalidate([
          ['notifications'],
          ['notifications-unread'],
          ['journeys'],
          ['journeys-summary'],
          ['my-disruptions'],
          ['journey-impact'],
          ['journey-recommendations'],
        ])
      },
      onUnauthorized: triggerUnauthorized,
    })

    const unregister = registerSessionCleanup(close)
    return () => {
      unregister()
      close()
    }
  }, [enqueuePrompt, invalidate, queryClient, status, token, userId])

  const value = useMemo<RealtimeContextValue>(
    () => ({
      prompt: queue[0] ?? null,
      queuedCount: queue.length,
      dismissPrompt,
    }),
    [dismissPrompt, queue],
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}

export { RealtimeProvider }
