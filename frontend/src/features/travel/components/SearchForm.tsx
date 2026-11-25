import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeftRight, Info, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { CLASS_OPTIONS, QUOTA_OPTIONS, className, quotaName } from '../constants'
import { formatDisplayDate, maxTravelIso, todayIso, validateTravelDate } from '../date'
import type { QuotaCode, SearchValues, StationValue } from '../types'
import { DateField } from './DateField'
import { StationCombobox } from './StationCombobox'

interface SearchFormProps {
  initialValues?: Partial<SearchValues>
  onSearch: (values: SearchValues) => void
  variant?: 'card' | 'bar'
  submitLabel?: string
  idPrefix?: string
  children?: ReactNode
}

interface FieldSelectProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  disabled?: boolean
}

function FieldSelect({ id, label, value, onChange, children, disabled }: FieldSelectProps) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-navy disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70"
      >
        {children}
      </select>
    </div>
  )
}

function resolveInitial(initialValues?: Partial<SearchValues>): SearchValues {
  return {
    from: initialValues?.from ?? null,
    to: initialValues?.to ?? null,
    date: initialValues?.date || todayIso(),
    classCode: initialValues?.classCode ?? '',
    quota: initialValues?.quota ?? 'GENERAL',
    pwd: initialValues?.pwd ?? false,
    flexible: initialValues?.flexible ?? false,
    railPass: initialValues?.railPass ?? false,
  }
}

function SearchForm({
  initialValues,
  onSearch,
  variant = 'card',
  submitLabel = 'Search Trains',
  idPrefix,
  children,
}: SearchFormProps) {
  const generated = useId()
  const prefix = idPrefix ?? generated
  const initial = resolveInitial(initialValues)

  const [from, setFrom] = useState<StationValue | null>(initial.from)
  const [to, setTo] = useState<StationValue | null>(initial.to)
  const [dateText, setDateText] = useState(formatDisplayDate(initial.date))
  const [date, setDate] = useState(initial.date)
  const [classCode, setClassCode] = useState(initial.classCode)
  const [quota, setQuota] = useState<QuotaCode>(initial.quota)
  const [pwd, setPwd] = useState(initial.pwd)
  const [flexible, setFlexible] = useState(initial.flexible)
  const [railPass, setRailPass] = useState(initial.railPass)
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState({ from: false, to: false, date: false })

  const dateResult = validateTravelDate(dateText)
  const sameStation = Boolean(from && to && from.code === to.code)
  const canSearch = Boolean(from && to && !sameStation && dateResult.iso)

  const fromError = !from
    ? submitted || touched.from
      ? 'Choose a departure station.'
      : undefined
    : undefined
  const toError = !to
    ? submitted || touched.to
      ? 'Choose an arrival station.'
      : undefined
    : sameStation
      ? 'From and To stations must be different.'
      : undefined
  const dateError = submitted || touched.date ? dateResult.error : undefined

  const swap = () => {
    const nextFrom = to
    const nextTo = from
    setFrom(nextFrom)
    setTo(nextTo)
    setTouched({ from: true, to: true, date: touched.date })
  }

  const handleDate = (text: string) => {
    setDateText(text)
    const result = validateTravelDate(text)
    setDate(result.iso ?? '')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (!canSearch || !from || !to || !dateResult.iso) {
      return
    }
    onSearch({
      from,
      to,
      date: dateResult.iso,
      classCode,
      quota,
      pwd,
      flexible,
      railPass,
    })
  }

  const showTatkalNote = quota === 'TATKAL' || quota === 'PREMIUM_TATKAL'

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div
        className={cn(
          'grid gap-3',
          variant === 'card'
            ? 'sm:grid-cols-2 xl:grid-cols-5'
            : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
        )}
      >
        <StationCombobox
          id={`${prefix}-from`}
          label="From"
          value={from}
          onChange={(station) => {
            setFrom(station)
            setTouched((current) => ({ ...current, from: true }))
          }}
          placeholder="Origin station"
          error={fromError}
        />
        <StationCombobox
          id={`${prefix}-to`}
          label="To"
          value={to}
          onChange={(station) => {
            setTo(station)
            setTouched((current) => ({ ...current, to: true }))
          }}
          placeholder="Destination station"
          error={toError}
        />
        <DateField
          id={`${prefix}-date`}
          value={dateText}
          onChange={handleDate}
          onBlur={() => {
            setTouched((current) => ({ ...current, date: true }))
            setDate(validateTravelDate(dateText).iso ?? date)
          }}
          error={dateError}
          description={`Today to ${formatDisplayDate(maxTravelIso())}`}
        />
        <FieldSelect
          id={`${prefix}-class`}
          label="Class"
          value={classCode}
          onChange={setClassCode}
        >
          <option value="">All Classes</option>
          {CLASS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FieldSelect>
        <FieldSelect
          id={`${prefix}-quota`}
          label="Quota"
          value={quota}
          onChange={(value) => setQuota(value as QuotaCode)}
        >
          {QUOTA_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FieldSelect>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Button type="button" variant="outline" size="sm" onClick={swap} className="w-fit">
            <ArrowLeftRight aria-hidden="true" />
            Swap stations
          </Button>
          {from && to ? (
            <p className="text-xs text-muted">
              {classCode ? className(classCode) : 'All classes'} · {quotaName(quota)}
            </p>
          ) : null}
        </div>
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="sr-only">Travel concessions and preferences</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Checkbox
              id={`${prefix}-pwd`}
              label="Person With Disability Concession"
              checked={pwd}
              onCheckedChange={(checked) => setPwd(checked === true)}
            />
            <Checkbox
              id={`${prefix}-flexible`}
              label="Flexible With Date"
              checked={flexible}
              onCheckedChange={(checked) => setFlexible(checked === true)}
            />
            <Checkbox
              id={`${prefix}-railpass`}
              label="Railway Pass Concession"
              checked={railPass}
              onCheckedChange={(checked) => setRailPass(checked === true)}
            />
          </div>
        </fieldset>
      </div>

      {showTatkalNote ? (
        <p className="flex items-start gap-1.5 rounded-lg bg-info-soft px-3 py-2 text-xs text-info">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Tatkal fares are dynamically priced and open at 10:00 AM one day before travel.
        </p>
      ) : null}

      {children}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          {canSearch
            ? `${from?.name} → ${to?.name} · ${formatDisplayDate(dateResult.iso ?? date)}`
            : 'Choose a From and To station, a valid date, and make sure they differ.'}
        </p>
        <Button
          type="submit"
          variant="cta"
          size="lg"
          disabled={!canSearch}
          className="w-full sm:w-auto"
        >
          <Search aria-hidden="true" />
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

export { SearchForm, type SearchFormProps }
