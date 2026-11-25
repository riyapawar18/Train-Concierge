import { Link } from 'react-router-dom'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useSession } from '@/app/SessionProvider'
import { Button } from '@/components/ui/button'

interface ProfileMenuProps {
  role: 'passenger' | 'admin'
  profileHref: string
  settingsHref: string
  onSignOut: () => void
}

const menuItemClass =
  'flex h-9 cursor-default items-center gap-2 rounded-md px-2.5 text-sm text-text outline-none select-none focus:bg-surface-muted'

function ProfileMenu({ role, profileHref, settingsHref, onSignOut }: ProfileMenuProps) {
  const { user } = useSession()
  const fallbackName = role === 'admin' ? 'Administrator' : 'Passenger'
  const name = user?.fullName?.trim() || fallbackName
  const roleLabel = role === 'admin' ? 'Administrator' : 'Passenger'
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'TC'

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 px-1.5 sm:pr-2.5"
          aria-label={`Open profile menu for ${name}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-navy text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="hidden flex-col items-start leading-tight sm:flex">
            <span className="max-w-32 truncate text-sm font-medium text-text">{name}</span>
            <span className="text-xs text-muted">{roleLabel}</span>
          </span>
          <ChevronDown className="hidden size-[18px] text-muted sm:block" aria-hidden="true" />
        </Button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-xl border border-border bg-surface p-1 shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <div className="px-2.5 py-2">
            <p className="text-sm font-semibold text-text">{name}</p>
            <p className="text-xs text-muted">{roleLabel}</p>
            {user?.email ? (
              <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
            ) : null}
          </div>
          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
          <DropdownMenuPrimitive.Item asChild>
            <Link to={profileHref} className={menuItemClass}>
              <User className="size-[18px] text-muted" aria-hidden="true" />
              My Profile
            </Link>
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item asChild>
            <Link to={settingsHref} className={menuItemClass}>
              <Settings className="size-[18px] text-muted" aria-hidden="true" />
              Settings
            </Link>
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
          <DropdownMenuPrimitive.Item
            onSelect={onSignOut}
            className={`${menuItemClass} text-danger focus:bg-danger-soft focus:text-danger`}
          >
            <LogOut className="size-[18px]" aria-hidden="true" />
            Sign Out
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}

export { ProfileMenu, type ProfileMenuProps }
