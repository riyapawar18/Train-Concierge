import { getStatusMeta } from '@/lib/status'
import { cn } from '@/lib/utils'

const LEGEND_STATUSES = ['AVAILABLE', 'LIMITED', 'SOLD_OUT'] as const

const dotClasses: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-neutral',
}

interface AvailabilityLegendProps {
  className?: string
}

function AvailabilityLegend({ className }: AvailabilityLegendProps) {
  return (
    <ul
      aria-label="Availability legend"
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted', className)}
    >
      {LEGEND_STATUSES.map((status) => {
        const meta = getStatusMeta(status)
        return (
          <li key={status} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-full', dotClasses[meta.tone])}
            />
            {meta.label}
          </li>
        )
      })}
    </ul>
  )
}

export { AvailabilityLegend, type AvailabilityLegendProps }
