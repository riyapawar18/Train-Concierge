import { getStatusMeta } from '@/lib/status'
import { Badge, type BadgeProps } from '@/components/ui/badge'

interface StatusBadgeProps extends Omit<BadgeProps, 'tone' | 'children'> {
  status: string
  label?: string
}

function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  const meta = getStatusMeta(status)

  return (
    <Badge tone={meta.tone} data-status={status.toUpperCase()} className={className} {...props}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label ?? meta.label}
    </Badge>
  )
}

export { StatusBadge, type StatusBadgeProps }
