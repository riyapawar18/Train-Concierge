import { useId, type ComponentProps } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps extends Omit<ComponentProps<'input'>, 'type'> {
  label?: string
  description?: string
  error?: string
}

function DatePicker({ label, description, error, className, id, ...props }: DatePickerProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = description ? `${inputId}-description` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <Calendar
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="date"
          data-slot="date-picker"
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(descriptionId, errorId) || undefined}
          className={cn(
            'h-10 w-full rounded-lg border border-border bg-surface pr-3 pl-10 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-navy disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 aria-invalid:border-danger [&::-webkit-calendar-picker-indicator]:cursor-pointer',
            className,
          )}
          {...props}
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

export { DatePicker, type DatePickerProps }
