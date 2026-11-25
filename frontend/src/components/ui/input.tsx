import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends ComponentProps<'input'> {
  label?: string
  description?: string
  error?: string
  trailing?: ReactNode
}

function Input({ label, description, error, trailing, className, id, ...props }: InputProps) {
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
        <input
          id={inputId}
          data-slot="input"
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(descriptionId, errorId) || undefined}
          className={cn(
            'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-muted/70 focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-navy disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 aria-invalid:border-danger aria-invalid:outline-danger',
            trailing && 'pr-11',
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>
        ) : null}
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

export { Input, type InputProps }
