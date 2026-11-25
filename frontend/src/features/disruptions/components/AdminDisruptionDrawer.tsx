import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BedDouble,
  CalendarClock,
  CheckCircle2,
  Link2Off,
  LoaderCircle,
  Moon,
  Route,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import { useToast } from '@/components/ui/toast'
import { normalizeApiError } from '@/lib/apiClient'
import { formatLongDate } from '@/features/travel/date'
import { formatDayTime } from '@/features/journeys/format'
import { getAdminDisruption, resolveDisruption } from '../api'
import {
  disruptionStatusMeta,
  formatDelay,
  impactMeta,
  severityMeta,
  typeLabel,
} from '../constants'

interface AdminDisruptionDrawerProps {
  disruptionId: number | null
  onOpenChange: (open: boolean) => void
}

function AdminDisruptionDrawer({ disruptionId, onOpenChange }: AdminDisruptionDrawerProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const detail = useQuery({
    queryKey: ['admin-disruption', disruptionId],
    queryFn: () => getAdminDisruption(disruptionId ?? 0),
    enabled: disruptionId !== null,
    refetchInterval: 30_000,
  })

  const mutation = useMutation({
    mutationFn: (id: number) => resolveDisruption(id),
    onSuccess: (response) => {
      toast({
        title: 'Disruption resolved',
        description: `${response.trainNumber} on ${formatLongDate(response.travelDate)} is back to its normal status.`,
        tone: 'success',
      })
      void queryClient.invalidateQueries({ queryKey: ['admin-disruptions'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-disruption', response.id] })
      void queryClient.invalidateQueries({ queryKey: ['my-disruptions'] })
      void queryClient.invalidateQueries({ queryKey: ['journeys'] })
      void queryClient.invalidateQueries({ queryKey: ['journeys-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['journey'] })
      void queryClient.invalidateQueries({ queryKey: ['train-status'] })
      void queryClient.invalidateQueries({ queryKey: ['journey-impact'] })
      setConfirmOpen(false)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Could not resolve this disruption',
        description: normalizeApiError(error).message,
        tone: 'danger',
      })
    },
  })

  const data = detail.data
  const statusMeta = data ? disruptionStatusMeta(data.status) : null
  const severity = data ? severityMeta(data.severity) : null

  return (
    <>
      <Dialog
        open={disruptionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            onOpenChange(false)
          }
        }}
      >
        <DialogContent className="top-0 right-0 left-auto h-dvh w-full max-w-xl translate-x-0 translate-y-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
          <div className="flex h-full flex-col">
            {detail.isLoading ? (
              <div className="flex flex-1 flex-col gap-3 p-5" aria-label="Loading disruption">
                <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
                <div className="mt-4 h-40 animate-pulse rounded-xl bg-surface-muted" />
              </div>
            ) : detail.isError ? (
              <div className="p-5">
                <ErrorState
                  title="We could not load this disruption"
                  description={normalizeApiError(detail.error).message}
                  onRetry={() => void detail.refetch()}
                />
              </div>
            ) : data ? (
              <>
                <DialogHeader className="border-b border-border px-5 py-4 pr-12">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle>
                      {data.trainName}{' '}
                      <span className="font-normal text-muted">· {data.trainNumber}</span>
                    </DialogTitle>
                    {statusMeta ? <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge> : null}
                  </div>
                  <DialogDescription>
                    {formatLongDate(data.travelDate)} · {typeLabel(data.type)} ·{' '}
                    {formatDelay(data.type, data.delayMinutes)}
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted">Passengers affected</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 font-semibold text-text">
                        <Users className="size-3.5 text-brand-navy" aria-hidden="true" />
                        {data.affectedPassengers}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted">Bookings affected</dt>
                      <dd className="mt-0.5 font-semibold text-text">{data.affectedBookings}</dd>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted">Alternatives generated</dt>
                      <dd className="mt-0.5 font-semibold text-text">{data.recommendationCount}</dd>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted">Severity</dt>
                      <dd className="mt-0.5">
                        {severity ? (
                          <Badge tone={severity.tone}>{severity.label}</Badge>
                        ) : (
                          <span className="font-semibold text-text">{data.severity}</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-lg border border-border px-3 py-2 text-sm">
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">Reason</p>
                    <p className="mt-1 text-text">{data.reason}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>Logged {formatDayTime(data.createdAt)}</span>
                    {data.resolvedAt ? <span>Resolved {formatDayTime(data.resolvedAt)}</span> : null}
                  </div>

                  <h3 className="mt-6 text-sm font-semibold text-text">Affected journeys</h3>
                  {data.impacts.length === 0 ? (
                    <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
                      No confirmed bookings were affected by this disruption.
                    </p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-2">
                      {data.impacts.map((impact) => {
                        const level = impactMeta(impact.impactLevel)
                        return (
                          <li key={impact.id} className="rounded-xl border border-border p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-text">
                                  {impact.passengerNames.join(', ')}
                                </p>
                                <p className="text-xs text-muted">
                                  PNR <span className="font-mono">{impact.pnr}</span> ·{' '}
                                  {impact.fromCode} → {impact.toCode}
                                </p>
                              </div>
                              <Badge tone={level.tone}>{level.label}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-text">{impact.summary}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                              <span className="flex items-center gap-1">
                                <CalendarClock className="size-3.5" aria-hidden="true" />
                                {impact.newArrival
                                  ? `Now arriving ${formatDayTime(impact.newArrival)}`
                                  : 'No expected arrival'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Route className="size-3.5" aria-hidden="true" />
                                {impact.recommendationCount} alternative
                                {impact.recommendationCount === 1 ? '' : 's'}
                              </span>
                              {impact.missedConnection ? (
                                <span className="flex items-center gap-1 text-warning">
                                  <Link2Off className="size-3.5" aria-hidden="true" />
                                  Missed connection
                                </span>
                              ) : null}
                              {impact.overnight ? (
                                <span className="flex items-center gap-1 text-warning">
                                  <Moon className="size-3.5" aria-hidden="true" />
                                  Overnight
                                </span>
                              ) : null}
                              {impact.needsHotel ? (
                                <span className="flex items-center gap-1 text-warning">
                                  <BedDouble className="size-3.5" aria-hidden="true" />
                                  Hotel needed
                                </span>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                <DialogFooter className="border-t border-border px-5 py-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  {data.status === 'ACTIVE' ? (
                    <Button onClick={() => setConfirmOpen(true)} disabled={mutation.isPending}>
                      {mutation.isPending ? (
                        <LoaderCircle className="animate-spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 aria-hidden="true" />
                      )}
                      Resolve
                    </Button>
                  ) : null}
                </DialogFooter>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Resolve this disruption?"
        description={
          data
            ? `${data.trainNumber} on ${formatLongDate(data.travelDate)} will return to its normal running status. Affected journeys are restored and the generated alternatives are no longer shown to passengers.`
            : ''
        }
        confirmLabel="Resolve disruption"
        cancelLabel="Keep active"
        onConfirm={() => {
          if (data) {
            mutation.mutate(data.id)
          }
        }}
      />
    </>
  )
}

export { AdminDisruptionDrawer, type AdminDisruptionDrawerProps }
