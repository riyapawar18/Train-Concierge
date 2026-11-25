import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { findActiveNav, type NavConfig } from './nav'
import { NotificationBell } from './NotificationBell'
import { ProfileMenu } from './ProfileMenu'

interface HeaderProps {
  nav: NavConfig
  onOpenNav: () => void
  onSignOut: () => void
}

function Header({ nav, onOpenNav, onSignOut }: HeaderProps) {
  const { pathname } = useLocation()
  const active = findActiveNav(nav, pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onOpenNav}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden truncate font-semibold tracking-wide text-muted uppercase sm:inline">
            {active?.group.label ?? nav.label}
          </span>
          <span aria-hidden="true" className="hidden text-border sm:inline">
            /
          </span>
          <span className="truncate font-medium text-text">
            {active?.item.label ?? 'Overview'}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationBell
          to={nav.role === 'admin' ? '/admin/notifications' : '/app/notifications'}
        />
        <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
        <ProfileMenu
          role={nav.role}
          profileHref={nav.role === 'admin' ? '/admin/profile' : '/app/profile'}
          settingsHref={nav.role === 'admin' ? '/admin/settings' : '/app/settings'}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  )
}

export { Header, type HeaderProps }
