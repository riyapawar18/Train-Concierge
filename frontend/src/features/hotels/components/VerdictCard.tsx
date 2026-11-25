import { BedDouble, Phone, RefreshCw, Send } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { HotelImpactSummary } from '../types'
import { verdictLabel, verdictTone } from '../constants'
import { createExtensionRequest } from '../api'

interface Props {
  bookingId: number
  hotelPhone?: string | null
  impact: HotelImpactSummary
  stationCode?: string
}

function actionLabel(action: string): string {
  switch (action) {
    case 'NOTIFY_HOTEL': return 'Notify hotel'
    case 'REQUEST_EXTENSION': return 'Request extension'
    case 'SHIFT_STAY': return 'Shift stay by one night'
    case 'CALL_HOTEL': return 'Call hotel'
    case 'SEE_NEARBY': return 'See nearby stays'
    default: return action
  }
}

/**
 * Shows the extension verdict with the answer first, then action buttons.
 * "Notify hotel" sends your details to the hotel — it never claims a confirmed hold.
 */
export function VerdictCard({ bookingId, hotelPhone, impact, stationCode }: Props) {
  const qc = useQueryClient()
  const [notifying, setNotifying] = useState(false)
  const [notified, setNotified] = useState(false)

  async function handleNotify() {
    setNotifying(true)
    try {
      await createExtensionRequest(bookingId, 'LATE_ARRIVAL')
      setNotified(true)
      void qc.invalidateQueries({ queryKey: ['hotel-bookings'] })
    } catch {
      // error handled via toast in parent
    } finally {
      setNotifying(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      {/* Verdict badge — answer comes first */}
      <div className="flex items-center gap-2">
        <Badge tone={verdictTone(impact.verdict)}>
          {verdictLabel(impact.verdict)}
        </Badge>
      </div>

      {/* The summary leads with the answer */}
      <p className="text-sm text-text">{impact.summary}</p>

      {/* Actions */}
      {impact.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {impact.actions.map((action) => {
            if (action === 'NOTIFY_HOTEL') {
              return (
                <Button
                  key={action}
                  size="sm"
                  variant={notified ? 'outline' : 'cta'}
                  disabled={notifying || notified}
                  onClick={() => void handleNotify()}
                >
                  <Send className="size-3.5" aria-hidden="true" />
                  {notified ? "We've sent your details to the hotel" : actionLabel(action)}
                </Button>
              )
            }
            if (action === 'CALL_HOTEL' && hotelPhone) {
              return (
                <Button key={action} size="sm" variant="outline" asChild>
                  <a href={`tel:${hotelPhone}`}>
                    <Phone className="size-3.5" aria-hidden="true" />
                    Call hotel
                  </a>
                </Button>
              )
            }
            if (action === 'SEE_NEARBY' && stationCode) {
              return (
                <Button key={action} size="sm" variant="outline" asChild>
                  <Link to={`/app/hotels?station=${stationCode}`}>
                    <BedDouble className="size-3.5" aria-hidden="true" />
                    See nearby stays
                  </Link>
                </Button>
              )
            }
            if (action === 'SHIFT_STAY') {
              return (
                <Button key={action} size="sm" variant="outline" asChild>
                  <Link to={`/app/hotels/bookings/${bookingId}?shift=1`}>
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    Shift stay by one night
                  </Link>
                </Button>
              )
            }
            if (action === 'REQUEST_EXTENSION') {
              return (
                <Button key={action} size="sm" variant="outline" asChild>
                  <Link to={`/app/hotels/bookings/${bookingId}?extend=1`}>
                    {actionLabel(action)}
                  </Link>
                </Button>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}
