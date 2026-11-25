import { TrainFront } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  formatDuration,
  formatFare,
  LEVEL_META,
  runsOnLabel,
  TONE_CHIP,
  typeMeta,
} from '../constants'
import type { ClassAvailability, QuotaCode, TrainResult } from '../types'
import { SeatSelectionPanel } from './SeatSelectionPanel'

interface TrainCardProps {
  train: TrainResult
  date: string
  openClass: string | null
  onOpenClass: (classCode: string | null) => void
  quota?: QuotaCode
}

function classChipLabel(travelClass: ClassAvailability): string {
  return `${travelClass.code} ${travelClass.label} ${formatFare(travelClass.fare)}`
}

function TrainCard({ train, date, openClass, onOpenClass, quota = 'GENERAL' }: TrainCardProps) {
  const meta = typeMeta(train.type)

  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <h3 className="text-base font-semibold text-text">{train.trainName}</h3>
            <span className="text-xs font-medium text-muted">#{train.trainNumber}</span>
          </div>
          <p className="text-xs text-muted">{runsOnLabel(train.runsOn)}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <div className="min-w-20">
            <p className="text-xl font-semibold text-text tabular-nums">{train.from.departure}</p>
            <p className="text-xs font-medium text-text">
              {train.from.code}
              {train.from.dayOffset > 0 ? ` +${train.from.dayOffset}d` : ''}
            </p>
            <p className="max-w-32 truncate text-xs text-muted">{train.from.name}</p>
          </div>

          <div className="flex min-w-28 flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center gap-2 text-muted">
              <span className="h-px flex-1 bg-border" />
              <TrainFront className="size-4" aria-hidden="true" />
              <span className="h-px flex-1 bg-border" />
            </div>
            <p className="text-xs text-muted">
              {formatDuration(train.durationMinutes)} · {train.distanceKm} km
            </p>
          </div>

          <div className="min-w-20 text-right">
            <p className="text-xl font-semibold text-text tabular-nums">
              {train.to.arrival}
              {train.to.dayOffset > 0 ? (
                <span className="ml-1 align-top text-[10px] font-medium text-info">
                  +{train.to.dayOffset}d
                </span>
              ) : null}
            </p>
            <p className="text-xs font-medium text-text">{train.to.code}</p>
            <p className="max-w-32 truncate text-xs text-muted">{train.to.name}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          {train.classes.map((travelClass) => {
            const open = openClass === travelClass.code
            return (
              <button
                key={travelClass.code}
                type="button"
                aria-pressed={open}
                aria-expanded={open}
                aria-label={`${classChipLabel(travelClass)}${open ? ', selected' : ''}`}
                onClick={() => onOpenClass(open ? null : travelClass.code)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy',
                  TONE_CHIP[LEVEL_META[travelClass.level].tone],
                  open && 'ring-2 ring-brand-navy ring-offset-1',
                )}
              >
                <span className="font-semibold">{travelClass.code}</span>
                <span>{travelClass.label}</span>
                <span className="tabular-nums">{formatFare(travelClass.fare)}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {openClass
            ? 'Choose seats below, then use Book Now. Holds expire automatically.'
            : 'Select a class chip to see the seat map and hold seats.'}
        </p>
      </div>

      {openClass ? (
        <div className="border-t border-border p-3 sm:p-4">
          <SeatSelectionPanel
            key={`${train.trainNumber}-${openClass}`}
            trainNumber={train.trainNumber}
            trainName={train.trainName}
            date={date}
            initialClass={openClass}
            onClose={() => onOpenClass(null)}
            route={{
              from: { code: train.from.code, name: train.from.name },
              to: { code: train.to.code, name: train.to.name },
            }}
            baseFare={train.classes.find((item) => item.code === openClass)?.baseFare ?? null}
            quota={quota}
          />
        </div>
      ) : null}
    </Card>
  )
}

export { TrainCard, type TrainCardProps }
