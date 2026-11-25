import { Check, Lock, X } from 'lucide-react'

const items = [
  {
    label: 'Available',
    swatch: 'border-success/40 bg-success-soft text-success',
    icon: null,
  },
  {
    label: 'Occupied',
    swatch:
      'border-border bg-[linear-gradient(135deg,transparent_45%,rgba(91,107,135,0.18)_45%,rgba(91,107,135,0.18)_55%,transparent_55%)] bg-[length:6px_6px] bg-surface-muted text-muted',
    icon: X,
  },
  {
    label: 'Selected',
    swatch: 'border-brand-navy bg-brand-navy text-white',
    icon: Check,
  },
  {
    label: 'Held',
    swatch: 'border-warning/40 bg-warning-soft text-warning',
    icon: Lock,
  },
] as const

function SeatLegend({ className }: { className?: string }) {
  return (
    <ul
      aria-label="Seat map legend"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${className ?? ''}`}
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              aria-hidden="true"
              className={`grid size-4 place-items-center rounded-[4px] border ${item.swatch}`}
            >
              {Icon ? <Icon className="size-2.5" strokeWidth={3} /> : null}
            </span>
            {item.label}
          </li>
        )
      })}
    </ul>
  )
}

export { SeatLegend }
