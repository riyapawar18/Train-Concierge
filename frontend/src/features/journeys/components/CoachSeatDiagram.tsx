import { cn } from '@/lib/utils'
import type { CoachLayout } from '@/features/travel/types'

interface CoachSeatDiagramProps {
  coachNo: string
  layout: CoachLayout
  total: number
  seatNos: number[]
  className?: string
}

const MAX_CELLS = 80

function CoachSeatDiagram({ coachNo, layout, total, seatNos, className }: CoachSeatDiagramProps) {
  const booked = new Set(seatNos)
  const highest = Math.max(total, ...seatNos, 0)
  const cells = Math.min(Math.max(highest, 8), MAX_CELLS)
  const labelled = [...booked].sort((a, b) => a - b).join(', ')

  return (
    <div className={cn('rounded-xl border border-border bg-surface-muted/50 p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text">Coach {coachNo}</p>
        <p className="text-[11px] text-muted">
          {layout === 'BERTH' ? 'Berth layout' : 'Chair layout'} · {total} seats
        </p>
      </div>
      <div
        role="img"
        aria-label={`Coach ${coachNo} diagram with seats ${labelled} highlighted`}
        className="mt-2 grid grid-cols-8 gap-1 sm:grid-cols-10"
      >
        {Array.from({ length: cells }, (_, index) => index + 1).map((seatNo) => {
          const mine = booked.has(seatNo)
          return (
            <span
              key={seatNo}
              aria-hidden="true"
              className={cn(
                'grid h-5 place-items-center rounded text-[9px] tabular-nums',
                mine
                  ? 'bg-brand-navy font-semibold text-white'
                  : 'bg-surface text-muted/80 ring-1 ring-border',
              )}
            >
              {seatNo}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export { CoachSeatDiagram, type CoachSeatDiagramProps }
