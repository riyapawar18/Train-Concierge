import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}

function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      data-slot="switch"
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-brand-navy bg-brand-navy' : 'border-border bg-surface-muted',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'block size-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  )
}

export { Switch, type SwitchProps }
