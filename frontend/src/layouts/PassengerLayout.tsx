import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RealtimeProvider } from '@/features/notifications/RealtimeProvider'
import { AppShell } from './AppShell'
import { passengerNav } from './nav'
import { DisruptionModalHost } from './DisruptionModalHost'

export function PassengerLayout() {
  return (
    <ErrorBoundary>
      <RealtimeProvider>
        <AppShell nav={passengerNav} />
        <DisruptionModalHost />
      </RealtimeProvider>
    </ErrorBoundary>
  )
}
