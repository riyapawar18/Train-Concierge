import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { cn } from '@/lib/utils'
import { isNavItemActive, type NavConfig } from './nav'

interface SidebarProps {
  nav: NavConfig
  className?: string
  onNavigate?: () => void
  onClose?: () => void
  onSignOut?: () => void
}

const itemBase =
  'relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-orange'

function Sidebar({ nav, className, onNavigate, onClose, onSignOut }: SidebarProps) {
  const { pathname } = useLocation()

  return (
    <div className={cn('flex h-full w-full flex-col bg-brand-navy text-white', className)}>
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4">
        <Link
          to={nav.home}
          onClick={onNavigate}
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-orange"
        >
          <BrandMark onDark size="sm" admin={nav.role === 'admin'} />
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-orange"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav aria-label={nav.navLabel} className="flex-1 overflow-y-auto px-3 py-5">
        {nav.groups.map((group) => (
          <div key={group.label} className="mb-6 last:mb-0">
            <p className="px-3 pb-2 text-xs font-semibold tracking-[0.14em] text-white/60">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon

                if (item.action === 'sign-out') {
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        onClick={onSignOut}
                        className={cn(itemBase, 'w-full text-left')}
                      >
                        <Icon className="size-5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    </li>
                  )
                }

                const active = isNavItemActive(pathname, item)

                return (
                  <li key={item.label}>
                    <Link
                      to={item.to ?? nav.home}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      data-active={active}
                      className={cn(itemBase, active && 'bg-white/10 font-medium text-white')}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-accent-orange transition-opacity',
                          active ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-white/60">Your journey, protected.</p>
      </div>
    </div>
  )
}

export { Sidebar, type SidebarProps }
