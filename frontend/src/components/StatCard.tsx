import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: string
  icon?: LucideIcon
  className?: string
}

function StatCard({ label, value, hint, icon: Icon, className }: StatCardProps) {
  return (
    <Card className={cn('flex items-start justify-between gap-4 p-5', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-text">{value}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      {Icon ? (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-brand-navy">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      ) : null}
    </Card>
  )
}

export { StatCard, type StatCardProps }
