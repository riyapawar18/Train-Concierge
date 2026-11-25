import { TrainFront } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandMarkProps {
  onDark?: boolean
  admin?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const markSizes = {
  sm: 'size-8 rounded-lg',
  md: 'size-9 rounded-[10px]',
  lg: 'size-11 rounded-xl',
}

const iconSizes = {
  sm: 'size-[18px]',
  md: 'size-5',
  lg: 'size-6',
}

const wordmarkSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

function BrandMark({ onDark = false, admin = false, size = 'md', className }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'grid shrink-0 place-items-center bg-accent-orange text-brand-navy-dark',
          markSizes[size],
        )}
        aria-hidden="true"
      >
        <TrainFront className={iconSizes[size]} strokeWidth={2.2} />
      </span>
      <span
        className={cn(
          'font-bold tracking-tight whitespace-nowrap',
          wordmarkSizes[size],
          onDark ? 'text-white' : 'text-brand-navy',
        )}
      >
        TrainConcierge
      </span>
      {admin ? (
        <span className="rounded-full border border-accent-orange/50 bg-white/10 px-1.5 py-px text-xs font-semibold tracking-wide text-white uppercase">
          Admin
        </span>
      ) : null}
    </span>
  )
}

export { BrandMark, type BrandMarkProps }
