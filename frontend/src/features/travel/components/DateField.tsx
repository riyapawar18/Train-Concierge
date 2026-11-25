import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateFieldProps {
  label?: string
  value: string
  onChange: (text: string) => void
  onBlur?: () => void
  error?: string
  description?: string
  id: string
  className?: string
}

function DateField({
  label = 'Travel date',
  value,
  onChange,
  onBlur,
  error,
  description,
  id,
  className,
}: DateFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <CalendarDays
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(descriptionId, errorId) || undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-10 text-sm text-text placeholder:text-muted/70 focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-navy aria-invalid:border-danger aria-invalid:outline-danger"
        />
      </div>
      {description && !error ? (
        <p id={descriptionId} className="text-xs text-muted">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { DateField, type DateFieldProps }
