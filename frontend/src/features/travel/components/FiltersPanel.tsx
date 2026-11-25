import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { hasRefinements, type RouteSearch } from '../searchParams'
import { formatClock, TIME_BUCKETS, TONE_CHIP, TONE_DOT, TYPE_FILTERS } from '../constants'
import type { TrainSearchResponse } from '../types'

interface FiltersPanelProps {
  route: RouteSearch
  response: TrainSearchResponse
  onChange: (patch: Partial<RouteSearch>) => void
  onReset: () => void
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

function FilterSection({
  title,
  action,
  children,
  defaultOpen = true,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="border-b border-border pb-3 last:border-b-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="flex flex-1 items-center justify-between gap-2 py-1 text-left text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          {title}
          <ChevronDown
            className={cn('size-4 text-muted transition-transform', open && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
        {action}
      </div>
      {open ? <div className="mt-2">{children}</div> : null}
    </section>
  )
}

const rangeThumb =
  'pointer-events-none absolute inset-x-0 top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-navy [&::-moz-range-thumb]:bg-surface [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-navy [&::-webkit-slider-thumb]:bg-surface'

function RangeFilter({
  label,
  from,
  to,
  onChange,
}: {
  label: string
  from: number
  to: number
  onChange: (patch: Partial<RouteSearch>) => void
}) {
  const [range, setRange] = useState<[number, number]>([from, to])
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    setRange([from, to])
  }, [from, to])

  useEffect(
    () => () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
      }
    },
    [],
  )

  const keys =
    label === 'Departure'
      ? { from: 'depFrom', to: 'depTo' }
      : { from: 'arrFrom', to: 'arrTo' }

  const commit = (next: [number, number]) => {
    setRange(next)
    onChange({ [keys.from]: next[0], [keys.to]: next[1] } as Partial<RouteSearch>)
  }

  const schedule = (next: [number, number]) => {
    setRange(next)
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
    }
    timer.current = window.setTimeout(() => {
      timer.current = null
      onChange({ [keys.from]: next[0], [keys.to]: next[1] } as Partial<RouteSearch>)
    }, 250)
  }

  const startPercent = (range[0] / 1440) * 100
  const endPercent = (range[1] / 1440) * 100

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        {TIME_BUCKETS.map((bucket) => {
          const selected = range[0] === bucket.from && range[1] === bucket.to
          return (
            <button
              key={bucket.label}
              type="button"
              aria-pressed={selected}
              aria-label={`${label} ${bucket.ariaLabel}`}
              onClick={() =>
                selected ? commit([0, 1440]) : commit([bucket.from, bucket.to])
              }
              className={cn(
                'flex flex-col items-start rounded-md border px-2 py-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy',
                selected
                  ? 'border-brand-navy bg-brand-navy text-white'
                  : 'border-border bg-surface text-muted hover:border-brand-navy/30 hover:text-text',
              )}
            >
              <span className="text-[11px] font-semibold">{bucket.label}</span>
              <span
                className={cn(
                  'text-[10px] tabular-nums',
                  selected ? 'text-white/75' : 'text-muted/80',
                )}
              >
                {bucket.rangeLabel}
              </span>
            </button>
          )
        })}
      </div>

      <div className="relative h-5">
        <span className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 rounded-full bg-surface-muted" />
        <span
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-navy"
          style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
        />
        <input
          type="range"
          min={0}
          max={1440}
          step={30}
          value={range[0]}
          aria-label={`${label} from time`}
          aria-valuetext={formatClock(range[0])}
          onChange={(event) =>
            schedule([Math.min(Number(event.target.value), range[1] - 30), range[1]])
          }
          className={rangeThumb}
        />
        <input
          type="range"
          min={0}
          max={1440}
          step={30}
          value={range[1]}
          aria-label={`${label} to time`}
          aria-valuetext={formatClock(range[1])}
          onChange={(event) =>
            schedule([range[0], Math.max(Number(event.target.value), range[0] + 30)])
          }
          className={rangeThumb}
        />
      </div>
      <p className="text-[11px] text-muted">
        {formatClock(range[0])} – {formatClock(range[1])}
      </p>
    </div>
  )
}

function FiltersPanel({ route, response, onChange, onReset }: FiltersPanelProps) {
  const classCodes = response.classes.map((option) => option.code)
  const allClasses = route.classCodes.length === 0
  const selectedClasses = allClasses ? classCodes : route.classCodes
  const stationOptions = response.fromStations.length + response.toStations.length > 0

  const toggleClass = (code: string) => {
    if (allClasses) {
      onChange({ classCodes: classCodes.filter((item) => item !== code) })
      return
    }
    const next = toggle(route.classCodes, code)
    onChange({ classCodes: next.length === classCodes.length ? [] : next })
  }

  return (
    <aside
      aria-label="Refine results"
      className="rounded-xl border border-border bg-surface p-4 shadow-card"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text">
          <SlidersHorizontal className="size-4 text-brand-navy" aria-hidden="true" />
          Refine Results
        </h2>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasRefinements(route)}
          onClick={onReset}
          className="h-7 px-2 text-xs"
        >
          <X aria-hidden="true" />
          Remove Filter
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <FilterSection
          title="Journey Class"
          action={
            <button
              type="button"
              onClick={() => onChange({ classCodes: [] })}
              disabled={allClasses}
              className="text-xs font-medium text-brand-navy disabled:opacity-50"
            >
              Select All
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-x-2 gap-y-2.5">
            {response.classes.map((option) => {
              const selected = selectedClasses.includes(option.code)
              return (
                <Checkbox
                  key={option.code}
                  id={`filter-class-${option.code}`}
                  label={`${option.code} · ${option.count} ${option.count === 1 ? 'train' : 'trains'}`}
                  checked={selected}
                  onCheckedChange={() => toggleClass(option.code)}
                />
              )
            })}
          </div>
        </FilterSection>

        <FilterSection title="Train Type">
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FILTERS.map((filter) => {
              const selected = route.types.includes(filter.value)
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ types: toggle(route.types, filter.value) })}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy',
                    TONE_CHIP[filter.tone],
                    selected
                      ? 'ring-2 ring-brand-navy ring-offset-1'
                      : 'hover:border-brand-navy/40',
                  )}
                >
                  <span
                    className={cn('size-1.5 rounded-full', TONE_DOT[filter.tone])}
                    aria-hidden="true"
                  />
                  {filter.label}
                  {selected ? (
                    <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                  ) : null}
                </button>
              )
            })}
          </div>
        </FilterSection>

        <FilterSection title="Departure">
          <RangeFilter
            label="Departure"
            from={route.depFrom}
            to={route.depTo}
            onChange={onChange}
          />
        </FilterSection>

        <FilterSection title="Arrival">
          <RangeFilter
            label="Arrival"
            from={route.arrFrom}
            to={route.arrTo}
            onChange={onChange}
          />
        </FilterSection>

        {stationOptions ? (
          <>
            <FilterSection title="From Station">
              <div className="flex flex-col gap-2">
                {response.fromStations.map((option) => (
                  <Checkbox
                    key={option.code}
                    id={`filter-from-${option.code}`}
                    label={`${option.name} (${option.code}) · ${option.count}`}
                    checked={route.fromStations.includes(option.code)}
                    onCheckedChange={(checked) =>
                      onChange({
                        fromStations: checked
                          ? [...route.fromStations, option.code]
                          : route.fromStations.filter((code) => code !== option.code),
                      })
                    }
                  />
                ))}
              </div>
            </FilterSection>

            <FilterSection title="To Station">
              <div className="flex flex-col gap-2">
                {response.toStations.map((option) => (
                  <Checkbox
                    key={option.code}
                    id={`filter-to-${option.code}`}
                    label={`${option.name} (${option.code}) · ${option.count}`}
                    checked={route.toStations.includes(option.code)}
                    onCheckedChange={(checked) =>
                      onChange({
                        toStations: checked
                          ? [...route.toStations, option.code]
                          : route.toStations.filter((code) => code !== option.code),
                      })
                    }
                  />
                ))}
              </div>
            </FilterSection>
          </>
        ) : null}
      </div>
    </aside>
  )
}

export { FiltersPanel, type FiltersPanelProps }
