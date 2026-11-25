import { MapPin, Phone, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { HotelSummary } from '../types'
import { formatCurrency } from '../constants'

interface Props {
  hotel: HotelSummary
}

export function HotelCard({ hotel }: Props) {
  return (
    <Card>
      {/* Generic illustration placeholder */}
      <div
        className="h-28 rounded-t-xl bg-gradient-to-br from-brand-navy/10 to-brand-navy/5 flex items-center justify-center"
        aria-hidden="true"
      >
        <span className="text-4xl">🏨</span>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base">{hotel.name}</CardTitle>
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="size-3.5" aria-hidden="true" />
          {hotel.address} · {hotel.distanceKm} km from station
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-1 text-muted">
            <Star className="size-3.5 fill-warning stroke-warning" aria-hidden="true" />
            {hotel.rating}
          </span>
          <span className="font-medium text-text">
            {formatCurrency(hotel.priceMin)}–{formatCurrency(hotel.priceMax)} / night
          </span>
        </div>

        <p className="text-xs text-muted">
          {hotel.availableRoomsTonight > 0
            ? `${hotel.availableRoomsTonight} rooms available tonight`
            : 'Check availability'}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="cta" className="flex-1">
            <Link to={`/app/hotels/${hotel.id}`}>View rooms</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={`tel:${hotel.phone}`} aria-label={`Call ${hotel.name}`}>
              <Phone className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={hotel.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View ${hotel.name} on map`}
            >
              <MapPin className="size-3.5" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
