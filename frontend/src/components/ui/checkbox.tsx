import { useId } from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  label: string
  description?: string
  checked?: boolean
  defaultChecked?: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
  className?: string
  id?: string
}

function Checkbox({
  label,
  description,
  className,
  id,
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
}: CheckboxProps) {
  const generatedId = useId()
  const checkboxId = id ?? generatedId

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <CheckboxPrimitive.Root
        id={checkboxId}
        data-slot="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-border bg-surface text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand-navy data-[state=checked]:bg-brand-navy data-[state=indeterminate]:border-brand-navy data-[state=indeterminate]:bg-brand-navy"
      >
        <CheckboxPrimitive.Indicator className="grid place-items-center">
          <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={checkboxId} className="text-sm font-medium text-text">
          {label}
        </label>
        {description ? <p className="text-xs text-muted">{description}</p> : null}
      </div>
    </div>
  )
}

export { Checkbox, type CheckboxProps }
