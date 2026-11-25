import { cn } from '@/lib/utils'
import type { ClassAvailability } from '../types'

interface ClassTabsProps {
  classes: ClassAvailability[]
  value: string
  onChange: (classCode: string) => void
}

function ClassTabs({ classes, value, onChange }: ClassTabsProps) {
  return (
    <div role="tablist" aria-label="Seat map class" className="flex flex-wrap gap-1">
      {classes.map((travelClass) => {
        const selected = travelClass.code === value
        return (
          <button
            key={travelClass.code}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(travelClass.code)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy',
              selected
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-border bg-surface text-text hover:border-brand-navy/30 hover:bg-surface-muted',
            )}
          >
            {travelClass.code}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                selected ? 'bg-white/15 text-white' : 'bg-surface-muted text-muted',
              )}
            >
              {travelClass.available} left
            </span>
          </button>
        )
      })}
    </div>
  )
}

export { ClassTabs }
