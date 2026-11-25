import { cn } from '@/lib/utils'
import type { CoachAvailability } from '../types'

interface CoachSelectorProps {
  coaches: CoachAvailability[]
  value: number | null
  onChange: (coachId: number) => void
}

function CoachSelector({ coaches, value, onChange }: CoachSelectorProps) {
  return (
    <div role="group" aria-label="Select a coach" className="flex flex-wrap gap-1.5">
      {coaches.map((coach) => {
        const selected = coach.id === value
        return (
          <button
            key={coach.id}
            type="button"
            aria-pressed={selected}
            aria-label={`Coach ${coach.coachNo}, ${coach.available} of ${coach.total} seats available`}
            onClick={() => onChange(coach.id)}
            className={cn(
              'flex min-w-16 flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy',
              selected
                ? 'border-brand-navy bg-brand-navy text-white'
                : 'border-border bg-surface text-text hover:border-brand-navy/30 hover:bg-surface-muted',
            )}
          >
            <span className="text-sm font-semibold">{coach.coachNo}</span>
            <span
              className={cn('text-[11px]', selected ? 'text-white/75' : 'text-muted')}
            >
              {coach.available} left
            </span>
          </button>
        )
      })}
    </div>
  )
}

export { CoachSelector }
