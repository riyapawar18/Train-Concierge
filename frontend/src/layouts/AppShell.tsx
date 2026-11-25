import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useSession } from '@/app/SessionProvider'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import type { NavConfig } from './nav'

interface AppShellProps {
  nav: NavConfig
}

function AppShell({ nav }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { signOut } = useSession()

  const handleSignOut = () => {
    void signOut()
  }

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="min-h-dvh bg-page">
      <Sidebar
        nav={nav}
        onSignOut={handleSignOut}
        className="fixed inset-y-0 left-0 z-40 hidden w-[260px] lg:flex"
      />

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          title="Navigation"
          description="Primary sections for your account"
          className="w-[280px] border-r-0 bg-brand-navy p-0"
        >
          <Sidebar
            nav={nav}
            onNavigate={closeDrawer}
            onClose={closeDrawer}
            onSignOut={handleSignOut}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-dvh flex-col lg:pl-[260px]">
        <Header nav={nav} onOpenNav={() => setDrawerOpen(true)} onSignOut={handleSignOut} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border bg-surface px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>TrainConcierge — your journey, protected.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export { AppShell, type AppShellProps }
