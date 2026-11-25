import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { normalizeApiError } from '@/lib/apiClient'
import { formatFare } from '@/features/travel/constants'
import { formatLongDate } from '@/features/travel/date'
import { cancelJourney } from '../api'
import { estimateRefund } from '../fare'
import type { JourneyCancelResponse } from '../types'

export interface CancelTarget {
  id: number
  pnr: string
  trainName: string
  travelDate: string
  boardingTime: string
  totalFare: number
}

interface CancelJourneyDialogProps {
  target: CancelTarget | null
  onOpenChange: (open: boolean) => void
  onCancelled?: (response: JourneyCancelResponse) => void
}

function CancelJourneyDialog({ target, onOpenChange, onCancelled }: CancelJourneyDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: number) => cancelJourney(id),
    onSuccess: (response) => {
      const refund = response.refund
      toast({
        title: `Journey cancelled · ${response.pnr}`,
        description: refund
          ? `Estimated refund ${formatFare(refund.amount)} (${refund.percent}% of the fare). Seats are released.`
          : 'The seats have been released.',
        tone: 'success',
      })
      void queryClient.invalidateQueries({ queryKey: ['journeys'] })
      void queryClient.invalidateQueries({ queryKey: ['journeys-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['journey', response.journeyId] })
      void queryClient.invalidateQueries({ queryKey: ['seats'] })
      void queryClient.invalidateQueries({ queryKey: ['availability'] })
      void queryClient.invalidateQueries({ queryKey: ['coaches'] })
      void queryClient.invalidateQueries({ queryKey: ['booking'] })
      onCancelled?.(response)
    },
    onError: (error: unknown) => {
      toast({
        title: 'Could not cancel this journey',
        description: normalizeApiError(error).message,
        tone: 'danger',
      })
    },
  })

  const refund = target ? estimateRefund(target.totalFare, target.boardingTime) : null
  const refundText = refund
    ? refund.percent > 0
      ? `Estimated refund: ${formatFare(refund.amount)} (${refund.percent}% of the fare).`
      : 'Estimated refund: ₹0 — departures within 4 hours are not refundable.'
    : ''

  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={onOpenChange}
      tone="destructive"
      title="Cancel this journey?"
      description={
        target
          ? `${target.pnr} · ${target.trainName} on ${formatLongDate(target.travelDate)} will be cancelled and the seats released. ${refundText}`
          : ''
      }
      confirmLabel="Cancel journey"
      cancelLabel="Keep journey"
      onConfirm={() => {
        if (target) {
          mutation.mutate(target.id)
        }
      }}
    />
  )
}

export { CancelJourneyDialog, type CancelJourneyDialogProps }
