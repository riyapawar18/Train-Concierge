import { BedDouble, Calendar, Hotel } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HotelBookingResponse } from '../types'
import { bookingStatusLabel, bookingStatusTone } from '../constants'
import { VerdictCard } from './VerdictCard'

interface Props {
  booking: HotelBookingResponse
  stationCode?: string
}

export function HotelBookingCard({ booking, stationCode }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hotel className="size-4 text-brand-navy" aria-hidden="true" />
            {booking.hotelName ?? 'Hotel stay'}
          </CardTitle>
          <div className="flex items-center gap-2">
            {booking.manualEntry && (
              <Badge tone="neutral" className="text-xs">Added by you</Badge>
            )}
            <Badge tone={bookingStatusTone(booking.status)}>
              {bookingStatusLabel(booking.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" aria-hidden="true" />
            Check-in {booking.checkInDate} at {booking.checkInTime}
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="size-3.5" aria-hidden="true" />
            {booking.roomType ?? 'Room'} {booking.roomNo ? `· ${booking.roomNo}` : ''}
          </span>
          <span>Check-out {booking.checkOutDate}</span>
        </div>

        {/* Verdict — answer comes first */}
        {booking.impact && (
          <VerdictCard
            bookingId={booking.id}
            hotelPhone={booking.hotelPhone}
            impact={booking.impact}
            stationCode={stationCode}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={`/app/hotels/bookings/${booking.id}`}>View stay details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
