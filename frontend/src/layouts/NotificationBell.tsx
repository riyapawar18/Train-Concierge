import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api'
import { notificationMeta } from '@/features/notifications/constants'
import { formatNotificationTime } from '@/features/notifications/format'
import type { UnreadCount } from '@/features/notifications/types'

interface NotificationBellProps {
  to: string
}

const menuItemClass =
  'flex cursor-default items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-text outline-none select-none focus:bg-surface-muted'

function UnreadBadge({ count }: { count: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-accent-orange px-1 text-[11px] leading-4 font-bold text-brand-navy-dark ring-2 ring-surface tabular-nums"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NotificationBell({ to }: NotificationBellProps) {
  const isPassenger = to.startsWith('/app')
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const unread = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: getUnreadCount,
    refetchInterval: isPassenger ? 60_000 : false,
  })

  const latest = useQuery({
    queryKey: ['notifications', 'bell'],
    queryFn: () => getNotifications({ page: 0, size: 5 }),
    enabled: isPassenger && open,
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

  const count = unread.data?.count ?? 0
  const label = `Notifications, ${count} unread`

  if (!isPassenger) {
    return (
      <Button asChild variant="ghost" size="icon" className="relative text-text hover:text-brand-navy">
        <Link to={to} aria-label={label}>
          <Bell className="size-5" aria-hidden="true" />
          {count > 0 ? <UnreadBadge count={count} /> : null}
        </Link>
      </Button>
    )
  }

  const items = latest.data?.items ?? []

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-text hover:text-brand-navy"
          aria-label={label}
        >
          <Bell className="size-5" aria-hidden="true" />
          {count > 0 ? <UnreadBadge count={count} /> : null}
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={8}
          aria-label="Recent notifications"
          className="z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <p className="text-sm font-semibold text-text">Notifications</p>
            <DropdownMenuPrimitive.Item
              disabled={count === 0 || markAll.isPending}
              onSelect={() => markAll.mutate()}
              className="flex cursor-default items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-navy outline-none select-none focus:bg-surface-muted data-[disabled]:opacity-50"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" />
              Mark all as read
            </DropdownMenuPrimitive.Item>
          </div>

          {latest.isLoading ? (
            <div className="flex flex-col gap-2 p-3" aria-label="Loading recent notifications">
              <div className="h-10 animate-pulse rounded-md bg-surface-muted" />
              <div className="h-10 animate-pulse rounded-md bg-surface-muted" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <Inbox className="size-6 text-muted" aria-hidden="true" />
              <p className="text-sm font-medium text-text">You&apos;re all caught up.</p>
              <p className="text-xs text-muted">Journey updates will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col p-1" role="group" aria-label="Latest notifications">
              {items.map((item) => {
                const meta = notificationMeta(item.type)
                const Icon = meta.icon
                return (
                  <DropdownMenuPrimitive.Item key={item.id} asChild>
                    <Link
                      to={item.linkPath ?? '/app/notifications'}
                      className={menuItemClass}
                      onClick={() => {
                        if (!item.read) {
                          markRead.mutate(item.id)
                        }
                      }}
                    >
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-brand-navy">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span
                          className={
                            item.read
                              ? 'truncate text-sm text-text'
                              : 'truncate text-sm font-semibold text-text'
                          }
                        >
                          {item.title}
                        </span>
                        <span className="line-clamp-2 text-xs text-muted">{item.body}</span>
                        <span className="text-[11px] text-muted">
                          {formatNotificationTime(item.createdAt)}
                        </span>
                      </span>
                      {item.read ? null : (
                        <span
                          aria-label="Unread"
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-orange"
                        />
                      )}
                    </Link>
                  </DropdownMenuPrimitive.Item>
                )
              })}
            </div>
          )}

          <div className="border-t border-border p-1">
            <DropdownMenuPrimitive.Item asChild>
              <Link
                to={to}
                className="flex h-9 items-center justify-center rounded-md text-sm font-medium text-brand-navy outline-none select-none hover:bg-surface-muted focus:bg-surface-muted"
              >
                View all notifications
              </Link>
            </DropdownMenuPrimitive.Item>
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export { NotificationBell, type NotificationBellProps }
