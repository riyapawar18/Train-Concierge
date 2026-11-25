import { useId } from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  label?: string
  placeholder?: string
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  name?: string
  description?: string
  error?: string
  className?: string
  id?: string
}

function Select({
  label,
  placeholder = 'Select an option',
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  description,
  error,
  className,
  id,
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const labelId = `${selectId}-label`
  const descriptionId = description ? `${selectId}-description` : undefined
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <span id={labelId} className="text-sm font-medium text-text">
          {label}
        </span>
      ) : null}
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
      >
        <SelectPrimitive.Trigger
          id={selectId}
          data-slot="select-trigger"
          aria-labelledby={label ? labelId : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(descriptionId, errorId) || undefined}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-navy disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 aria-invalid:border-danger data-[placeholder]:text-muted',
            className,
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="relative flex h-9 cursor-default items-center justify-between gap-2 rounded-md px-2.5 text-sm text-text outline-none select-none focus:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="size-4 text-brand-navy" aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
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

export { Select, type SelectProps }
