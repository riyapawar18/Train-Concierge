import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-neutral/15 bg-neutral-soft text-neutral',
        success: 'border-success/15 bg-success-soft text-success',
        warning: 'border-warning/15 bg-warning-soft text-warning',
        danger: 'border-danger/15 bg-danger-soft text-danger',
        info: 'border-info/15 bg-info-soft text-info',
        outline: 'border-border bg-transparent text-muted',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
)

interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants, type BadgeProps }
