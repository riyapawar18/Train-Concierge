import type { ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title?: string
  description: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

function EmptyState({
  title = 'Nothing to show yet',
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-surface-muted text-brand-navy">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-text">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted text-pretty">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export { EmptyState, type EmptyStateProps }
