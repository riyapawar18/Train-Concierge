import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppShell } from './AppShell'
import { adminNav } from './nav'

export function AdminLayout() {
  return (
    <ErrorBoundary>
      <AppShell nav={adminNav} />
    </ErrorBoundary>
  )
}
