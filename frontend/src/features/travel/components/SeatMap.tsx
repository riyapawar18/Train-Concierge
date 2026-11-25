import { Check, Lock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoachLayout, Seat } from '../types'

interface SeatMapProps {
  seats: Seat[]
  layout: CoachLayout
  selectedSeats: Set<number>
  onToggle: (seat: Seat) => void
  busy?: boolean
  coachNo: string
}

type SeatVisualState = 'available' | 'occupied' | 'held' | 'selected'

const seatClasses: Record<SeatVisualState, string> = {
  available: 'border-success/40 bg-success-soft text-success hover:border-success',
  occupied:
    'border-border bg-[linear-gradient(135deg,transparent_45%,rgba(91,107,135,0.18)_45%,rgba(91,107,135,0.18)_55%,transparent_55%)] bg-[length:6px_6px] bg-surface-muted text-muted',
  held: 'border-warning/40 bg-warning-soft text-warning',
  selected: 'border-brand-navy bg-brand-navy text-white',
}

function visualState(seat: Seat, selected: boolean): SeatVisualState {
  if (selected) {
    return 'selected'
  }
  if (seat.status === 'OCCUPIED') {
    return 'occupied'
  }
  if (seat.status === 'HELD') {
    return 'held'
  }
  return 'available'
}

function SeatButton({
  seat,
  state,
  berthLabel,
  disabled,
  onToggle,
}: {
  seat: Seat
  state: SeatVisualState
  berthLabel: string
  disabled: boolean
  onToggle: (seat: Seat) => void
}) {
  const Icon =
    state === 'selected' ? Check : state === 'held' ? Lock : state === 'occupied' ? X : null

  return (
    <button
      type="button"
      aria-label={`Seat ${seat.seatNo}, ${berthLabel}, ${state}`}
      aria-pressed={state === 'selected'}
      disabled={disabled}
      onClick={() => onToggle(seat)}
      title={`Seat ${seat.seatNo} · ${berthLabel}`}
      className={cn(
        'relative flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:cursor-not-allowed',
        seatClasses[state],
      )}
    >
      <span>{seat.seatNo}</span>
      <span className="text-[9px] font-medium opacity-80">{seat.berthType}</span>
      {Icon ? (
        <Icon className="absolute top-0.5 right-0.5 size-2.5" strokeWidth={3} aria-hidden="true" />
      ) : null}
    </button>
  )
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}

function SeatMap({ seats, layout, selectedSeats, onToggle, busy, coachNo }: SeatMapProps) {
  const berthLabel = (seat: Seat) =>
    layout === 'BERTH' ? `${seat.berthLabel} berth` : `${seat.berthLabel} seat`

  if (seats.length === 0) {
    return <p className="text-sm text-muted">No seats have been generated for this coach yet.</p>
  }

  return (
    <div className="min-w-0 overflow-x-auto pb-1">
      <div
        role="group"
        aria-label={`Coach ${coachNo} seat map`}
        aria-busy={busy || undefined}
        data-testid="seat-map"
        className="w-max min-w-full space-y-2"
      >
        {layout === 'BERTH'
          ? chunk(seats, 8).map((bay, bayIndex) => {
              const main = [bay[0], bay[3], bay[1], bay[4], bay[2], bay[5]].filter(
                (seat): seat is Seat => Boolean(seat),
              )
              const side = bay.slice(6)
              return (
                <div key={bayIndex} className="flex items-stretch gap-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    {main.map((seat) => {
                      const state = visualState(seat, selectedSeats.has(seat.seatNo))
                      return (
                        <SeatButton
                          key={seat.seatNo}
                          seat={seat}
                          state={state}
                          berthLabel={berthLabel(seat)}
                          disabled={busy || (state !== 'selected' && state !== 'available')}
                          onToggle={onToggle}
                        />
                      )
                    })}
                  </div>
                  <div className="flex items-center" aria-hidden="true">
                    <span className="h-16 w-px bg-border" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {side.map((seat) => {
                      const state = visualState(seat, selectedSeats.has(seat.seatNo))
                      return (
                        <SeatButton
                          key={seat.seatNo}
                          seat={seat}
                          state={state}
                          berthLabel={berthLabel(seat)}
                          disabled={busy || (state !== 'selected' && state !== 'available')}
                          onToggle={onToggle}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })
          : (() => {
              const left = layout === 'CHAIR_3x2' ? 3 : 2
              const right = layout === 'CHAIR_3x2' ? 2 : layout === 'CHAIR_2x2' ? 2 : 1
              return chunk(seats, left + right).map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-1.5">
                  <div className="flex gap-1.5">
                    {row.slice(0, left).map((seat) => {
                      const state = visualState(seat, selectedSeats.has(seat.seatNo))
                      return (
                        <SeatButton
                          key={seat.seatNo}
                          seat={seat}
                          state={state}
                          berthLabel={berthLabel(seat)}
                          disabled={busy || (state !== 'selected' && state !== 'available')}
                          onToggle={onToggle}
                        />
                      )
                    })}
                  </div>
                  <div className="w-3 shrink-0" aria-hidden="true" />
                  <div className="flex gap-1.5">
                    {row.slice(left).map((seat) => {
                      const state = visualState(seat, selectedSeats.has(seat.seatNo))
                      return (
                        <SeatButton
                          key={seat.seatNo}
                          seat={seat}
                          state={state}
                          berthLabel={berthLabel(seat)}
                          disabled={busy || (state !== 'selected' && state !== 'available')}
                          onToggle={onToggle}
                        />
                      )
                    })}
                  </div>
                </div>
              ))
            })()}
      </div>
    </div>
  )
}

export { SeatMap }
