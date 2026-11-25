import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, Route, TriangleAlert } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { formatFare } from '@/features/travel/constants'
import { formatDayTime } from '@/features/journeys/format'
import { getRecommendations } from '@/features/disruptions/api'
import { kindMeta, severityMeta } from '@/features/disruptions/constants'
import { useRealtime } from '@/features/notifications/RealtimeProvider'

function DisruptionModalHost() {
  const { prompt, dismissPrompt } = useRealtime()

  const recommendations = useQuery({
    queryKey: ['journey-recommendations', prompt?.journeyId],
    queryFn: () => getRecommendations(prompt?.journeyId ?? 0),
    enabled: Boolean(prompt),
  })

  if (!prompt) {
    return null
  }

  const severity = severityMeta(prompt.severity)
  const top = recommendations.data?.find((item) => item.recommended) ?? recommendations.data?.[0]
  const recoveryHref = `/app/recovery?journey=${prompt.journeyId}`
  const bookHref = top ? `${recoveryHref}&option=${top.id}` : recoveryHref
  const topKind = top ? kindMeta(top.kind) : null

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          dismissPrompt()
        }
      }}
    >
      <DialogContent role="alertdialog" aria-modal="true" showClose={false} className="max-w-xl">
        <DialogHeader className="pr-0">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-full bg-danger-soft text-danger">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </span>
            <Badge tone={severity.tone}>{severity.label}</Badge>
          </div>
          <DialogTitle className="pt-1">{prompt.title}</DialogTitle>
          <DialogDescription>{prompt.body}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted/60 p-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text">
            <span className="font-medium">
              {prompt.trainName}
              {prompt.trainNumber ? (
                <span className="font-normal text-muted"> · {prompt.trainNumber}</span>
              ) : null}
            </span>
            {prompt.newArrival ? (
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Clock3 className="size-3.5" aria-hidden="true" />
                New arrival {formatDayTime(prompt.newArrival)}
              </span>
            ) : null}
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              Recommended option
            </p>
            {recommendations.isLoading ? (
              <div className="mt-2 flex flex-col gap-2" aria-label="Loading recommendation">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ) : top ? (
              <div className="mt-2 flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={topKind?.tone ?? 'info'}>{topKind?.label ?? 'Option'}</Badge>
                  {top.recommended ? <Badge tone="success">Best option</Badge> : null}
                </div>
                <p className="text-sm font-semibold text-text">
                  {top.refName ?? 'Alternative option'}
                  {top.refTrainNumber ? (
                    <span className="font-normal text-muted"> · {top.refTrainNumber}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted">
                  {formatDayTime(top.departureAt)} → {formatDayTime(top.arrivalAt)} ·{' '}
                  {formatFare(top.fare)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">
                We are still preparing alternatives for this journey. Open the recovery page to
                check again.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-1">
          <Button variant="ghost" onClick={dismissPrompt}>
            Dismiss
          </Button>
          <Button asChild variant="outline">
            <Link to={recoveryHref} onClick={dismissPrompt}>
              <Route aria-hidden="true" />
              View all options
            </Link>
          </Button>
          <Button asChild variant="cta">
            <Link to={bookHref} onClick={dismissPrompt}>
              Book this
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { DisruptionModalHost }
