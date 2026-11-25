import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, CheckCheck, Inbox } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { normalizeApiError } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { formatDayTime } from '@/features/journeys/format'
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api'
import { NOTIFICATION_FILTERS, notificationMeta } from '@/features/notifications/constants'
import { formatNotificationTime } from '@/features/notifications/format'
import type { NotificationFilter, UnreadCount } from '@/features/notifications/types'

function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>('ALL')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const unread = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: getUnreadCount,
  })

  const notifications = useInfiniteQuery({
    queryKey: ['notifications', filter],
    queryFn: ({ pageParam }) => getNotifications({ filter, page: pageParam, size: 20 }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  })

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData<UnreadCount>(['notifications-unread'], { count: 0 })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const items = notifications.data?.pages.flatMap((page) => page.items) ?? []
  const unreadCount = unread.data?.count ?? 0

  const openNotification = (id: number, read: boolean, linkPath: string | null) => {
    if (!read) {
      markRead.mutate(id)
    }
    navigate(linkPath ?? '/app/notifications')
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Notifications"
        description="Journey alerts, recovery updates and booking messages, newest first."
        actions={
          <Button
            variant="outline"
            onClick={() => markAll.mutate()}
            disabled={unreadCount === 0 || markAll.isPending}
          >
            <CheckCheck aria-hidden="true" />
            Mark all as read
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Notification filters">
        {NOTIFICATION_FILTERS.map((option) => {
          const active = filter === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value)}
              className={
                active
                  ? 'rounded-full border border-brand-navy bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white'
                  : 'rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-muted'
              }
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {notifications.isLoading ? (
        <div className="flex flex-col gap-3" aria-label="Loading notifications">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : notifications.isError ? (
        <ErrorState
          title="We could not load your notifications"
          description={normalizeApiError(notifications.error).message}
          onRetry={() => void notifications.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={filter === 'UNREAD' ? BellRing : Inbox}
          title={filter === 'UNREAD' ? "You're all caught up." : 'No notifications yet'}
          description={
            filter === 'ALL'
              ? 'Journey alerts, seat updates and booking messages will appear here as soon as something changes.'
              : 'There are no notifications in this view. Try another filter.'
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((item) => {
              const meta = notificationMeta(item.type)
              const Icon = meta.icon
              return (
                <li key={item.id}>
                  <Card className={cn('transition-colors', !item.read && 'border-l-4 border-l-accent-orange')}>
                    <CardContent className="p-0">
                      <button
                        type="button"
                        onClick={() => openNotification(item.id, item.read, item.linkPath)}
                        className="flex w-full items-start gap-3 rounded-xl p-4 text-left hover:bg-surface-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy sm:p-5"
                      >
                        <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-surface-muted text-brand-navy">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'text-sm text-text',
                                item.read ? 'font-medium' : 'font-semibold',
                              )}
                            >
                              {item.title}
                            </span>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            {item.read ? null : (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-accent-orange">
                                <span className="size-1.5 rounded-full bg-accent-orange" aria-hidden="true" />
                                Unread
                              </span>
                            )}
                          </span>
                          <span className="text-sm text-muted">{item.body}</span>
                          <span className="text-xs text-muted" title={formatDayTime(item.createdAt)}>
                            {formatNotificationTime(item.createdAt)}
                          </span>
                        </span>
                        <Bell className="mt-1 size-4 shrink-0 text-muted" aria-hidden="true" />
                      </button>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>

          {notifications.hasNextPage ? (
            <Button
              variant="outline"
              className="self-center"
              onClick={() => void notifications.fetchNextPage()}
              disabled={notifications.isFetchingNextPage}
            >
              {notifications.isFetchingNextPage ? 'Loading…' : 'Load older notifications'}
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}

export { NotificationsPage }
