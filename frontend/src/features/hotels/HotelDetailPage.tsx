import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { useSession } from '@/app/SessionProvider'
import { PaymentCheckout } from '@/features/payment/PaymentCheckout'
import type { PaymentAuthorization, PaymentConfirmation, PaymentSubject } from '@/features/payment/types'
import { normalizeApiError } from '@/lib/apiClient'
import { getHotel, getHotelPolicy, getHotelRooms, holdRoom, createHotelBooking } from './api'
import { StayFlexibilityPanel } from './components/StayFlexibilityPanel'
import { RoomMap } from './components/RoomMap'
import type { RoomData } from './types'
import { formatCurrency } from './constants'

type Step = 'rooms' | 'review' | 'success'

export function HotelDetailPage() {
  const { id } = useParams()
  const hotelId = Number(id)
  const qc = useQueryClient()
  const { user } = useSession()
  const [searchParams] = useSearchParams()

  const journeyId = searchParams.get('journey') ? Number(searchParams.get('journey')) : null

  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const [checkIn, setCheckIn] = useState(today)
  const [checkOut, setCheckOut] = useState(tomorrow)
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null)
  const [rulesRead, setRulesRead] = useState(false)
  const [step, setStep] = useState<Step>('rooms')
  const [booking, setBooking] = useState(false)
  const [paying, setPaying] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [confirmedBookingId, setConfirmedBookingId] = useState<number | null>(null)
  const stayedConfirmed = useRef(false)

  const hotel = useQuery({
    queryKey: ['hotel', hotelId],
    queryFn: () => getHotel(hotelId),
    enabled: Boolean(hotelId),
  })

  const policy = useQuery({
    queryKey: ['hotel-policy', hotelId],
    queryFn: () => getHotelPolicy(hotelId),
    enabled: Boolean(hotelId),
  })

  const rooms = useQuery({
    queryKey: ['hotel-rooms', hotelId, checkIn, checkOut],
    queryFn: () => getHotelRooms(hotelId, checkIn, checkOut),
    enabled: Boolean(hotelId),
  })

  const nights = Math.max(1, (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
  const totalPrice = selectedRoom ? selectedRoom.pricePerNight * nights : 0

  const h = hotel.data

  const paymentSubject: PaymentSubject = {
    title: h?.name ?? 'Hotel stay',
    route: selectedRoom
      ? `Room ${selectedRoom.roomNo} · ${selectedRoom.roomType}`
      : 'Select a room to continue',
    schedule: `${checkIn} → ${checkOut} · ${nights} night${nights > 1 ? 's' : ''}`,
    lines: [
      { label: 'Nightly rate', value: formatCurrency(selectedRoom?.pricePerNight ?? 0) },
      { label: 'Nights', value: String(nights) },
      { label: 'Guests', value: '1' },
    ],
    amount: totalPrice,
    payerName: user?.fullName ?? 'Guest',
    payerEmail: user?.email,
  }

  /** Holds the room and creates the stay once payment is authorised. */
  async function authorizeHotelPayment(
    _authorization: PaymentAuthorization,
  ): Promise<PaymentConfirmation> {
    if (!selectedRoom || !h) {
      throw new Error('Select a room before paying.')
    }
    setBooking(true)
    setBookingError(null)
    try {
      await holdRoom(selectedRoom.id, checkIn, checkOut)
      const created = await createHotelBooking({
        hotelId,
        roomId: selectedRoom.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guests: 1,
        totalPrice: totalPrice,
        journeyId,
      })
      void qc.invalidateQueries({ queryKey: ['hotel-bookings'] })
      stayedConfirmed.current = true
      setConfirmedBookingId(created.id)
      return {
        referenceLabel: 'Stay booking',
        reference: `HB-${created.id}`,
        summary: [
          { label: 'Hotel', value: h.name },
          { label: 'Room', value: `${selectedRoom.roomNo} · ${selectedRoom.roomType}` },
          { label: 'Check-in', value: checkIn },
          { label: 'Check-out', value: checkOut },
          { label: 'Nights', value: String(nights) },
        ],
        detailsPath: `/app/hotels/bookings/${created.id}`,
      }
    } catch (err) {
      const message = normalizeApiError(err).message
      setBookingError(message)
      throw new Error(message)
    } finally {
      setBooking(false)
    }
  }

  if (!hotelId) return <EmptyState title="Hotel not found" description="Invalid hotel link." />

  if (hotel.isError) {
    const err = normalizeApiError(hotel.error)
    return err.status === 404 ? (
      <EmptyState
        title="Hotel not found"
        description="This hotel does not exist."
        action={<Button asChild variant="outline"><Link to="/app/hotels">Back to Hotels</Link></Button>}
      />
    ) : (
      <ErrorState title="Could not load hotel" description={err.message} onRetry={() => void hotel.refetch()} />
    )
  }

  const p = policy.data
  const rm = rooms.data

  const closeCheckout = () => {
    setPaying(false)
    // Only reached once the payment produced a confirmed stay.
    if (stayedConfirmed.current) setStep('success')
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 'success' && h && selectedRoom) {
    const whatsappText = encodeURIComponent(
      `🏨 *Hotel Booking Confirmed*\n\nHotel: ${h.name}\nRoom: ${selectedRoom.roomNo} (${selectedRoom.roomType})\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nTotal: ${formatCurrency(totalPrice)}`
    )
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center max-w-lg mx-auto">
        <span className="grid size-16 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-9" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-text">Hotel booked!</h1>
          <p className="mt-1 text-sm text-muted">Your stay is confirmed.</p>
        </div>
        <Card className="w-full text-left">
          <CardContent className="flex flex-col gap-2 pt-4 text-sm">
            <p className="font-semibold text-text text-base">{h.name}</p>
            <p className="text-muted">{h.address}</p>
            <p className="text-muted">Room {selectedRoom.roomNo} · {selectedRoom.roomType}</p>
            <div className="flex justify-between border-t border-border pt-2 mt-1">
              <span className="text-muted flex items-center gap-1"><Calendar className="size-3.5" aria-hidden />Check-in</span>
              <span className="font-medium">{checkIn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted flex items-center gap-1"><Calendar className="size-3.5" aria-hidden />Check-out</span>
              <span className="font-medium">{checkOut}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-1 font-semibold">
              <span>Total paid</span>
              <span className="text-brand-navy">{formatCurrency(totalPrice)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex w-full flex-wrap gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              const html = `<html><head><title>Hotel Booking – ${h.name}</title>
<style>body{font-family:sans-serif;padding:20px;max-width:500px;margin:auto}h2{color:#1a3a6b}.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee}</style></head>
<body><h2>🏨 Hotel Booking Confirmed</h2>
<div class="row"><b>Hotel</b><span>${h.name}</span></div>
<div class="row"><b>Room</b><span>${selectedRoom.roomNo} · ${selectedRoom.roomType}</span></div>
<div class="row"><b>Check-in</b><span>${checkIn}</span></div>
<div class="row"><b>Check-out</b><span>${checkOut}</span></div>
<div class="row"><b>Nights</b><span>${nights}</span></div>
<div class="row"><b>Total</b><span>${formatCurrency(totalPrice)}</span></div>
<p style="font-size:11px;color:#888;margin-top:12px">System-generated confirmation from TrainConcierge.</p>
</body></html>`
              const iframe = document.createElement('iframe')
              iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
              document.body.appendChild(iframe)
              iframe.onload = () => { iframe.contentWindow?.print(); setTimeout(() => document.body.removeChild(iframe), 1000) }
              iframe.src = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
            }}
          >
            <Download className="size-4" aria-hidden="true" />
            Download receipt
          </Button>
          <Button variant="outline" className="flex-1 border-[#25d366] text-[#25d366] hover:bg-[#25d366]/10" asChild>
            <a href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" aria-hidden="true" />
              Share on WhatsApp
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted">You can also view and download this later from Hotels &amp; Stay Recovery.</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button asChild variant="cta"><Link to="/app/hotels">View my stays</Link></Button>
          {confirmedBookingId && (
            <Button asChild variant="outline"><Link to={`/app/hotels/bookings/${confirmedBookingId}`}>View stay details</Link></Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/app/hotels" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-navy hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Hotels
      </Link>

      {hotel.isLoading && <div className="h-48 animate-pulse rounded-xl bg-surface" />}

      {h && (
        <>
          <div className="flex h-36 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy/10 to-brand-navy/5" aria-hidden="true">
            <span className="text-6xl">🏨</span>
          </div>

          <header>
            <h1 className="text-2xl font-semibold text-text">{h.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{h.address}</span>
              <span>{h.distanceKm} km from station</span>
              <span className="flex items-center gap-1"><Star className="size-3.5 fill-warning stroke-warning" aria-hidden />{h.rating}</span>
              <a href={`tel:${h.phone}`} className="flex items-center gap-1 hover:text-brand-navy"><Phone className="size-3.5" aria-hidden />{h.phone}</a>
              <a href={h.mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand-navy"><MapPin className="size-3.5" aria-hidden />View on map</a>
            </p>
            <p className="mt-1 text-sm font-medium text-text">{formatCurrency(h.priceMin)} – {formatCurrency(h.priceMax)} per night</p>
          </header>

          {p && <StayFlexibilityPanel policy={p} />}
          {policy.isLoading && <div className="h-40 animate-pulse rounded-xl bg-surface" />}

          {/* ── Review step ── */}
          {step === 'review' && selectedRoom && p && (
            <Card>
              <CardHeader><CardTitle>Review your booking</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2"><dt className="text-muted">Hotel</dt><dd className="font-medium text-text">{h.name}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted">Room</dt><dd className="text-text">{selectedRoom.roomNo} · {selectedRoom.roomType}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="flex items-center gap-1 text-muted"><Calendar className="size-3.5" aria-hidden />Check-in</dt><dd className="text-text">{checkIn} at {p.standardCheckinTime}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="flex items-center gap-1 text-muted"><Calendar className="size-3.5" aria-hidden />Check-out</dt><dd className="text-text">{checkOut} at {p.standardCheckoutTime}</dd></div>
                  <div className="flex justify-between gap-2 border-t border-border pt-1 font-semibold">
                    <dt className="text-text">Total ({nights} night{nights > 1 ? 's' : ''})</dt>
                    <dd className="text-text">{formatCurrency(totalPrice)}</dd>
                  </div>
                </dl>
                <StayFlexibilityPanel policy={p} />
                <Checkbox id="rules-read" label="I've read the stay rules" checked={rulesRead} onCheckedChange={(v) => setRulesRead(Boolean(v))} />
                {bookingError && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{bookingError}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('rooms')}>Back</Button>
                  <Button
                    variant="cta"
                    disabled={!rulesRead || booking}
                    onClick={() => setPaying(true)}
                    className="flex-1"
                  >
                    Pay Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Room selection step ── */}
          {step === 'rooms' && (
            <Card>
              <CardHeader><CardTitle>Select your room</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-text">Check-in</span>
                    <input type="date" value={checkIn} min={today} onChange={e => { setCheckIn(e.target.value); setSelectedRoom(null) }} className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-text">Check-out</span>
                    <input type="date" value={checkOut} min={checkIn} onChange={e => { setCheckOut(e.target.value); setSelectedRoom(null) }} className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm" />
                  </label>
                </div>
                {rooms.isLoading && <div className="h-40 animate-pulse rounded-xl bg-surface" />}
                {rm && <RoomMap floors={rm.floors} dateStrip={rm.dateStrip} totalRooms={rm.totalRooms} availableTonight={rm.availableTonight} selectedRoomId={selectedRoom?.id} onRoomSelect={setSelectedRoom} checkIn={checkIn} checkOut={checkOut} />}
                {selectedRoom && (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                    <span><span className="font-medium text-text">Room {selectedRoom.roomNo}</span> · <span className="text-muted">{selectedRoom.roomType}</span></span>
                    <span className="font-medium text-text">{formatCurrency(selectedRoom.pricePerNight)} / night</span>
                  </div>
                )}
                <Button disabled={!selectedRoom} onClick={() => setStep('review')} variant="cta">
                  Review booking
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <PaymentCheckout
        open={paying}
        subject={paymentSubject}
        onAuthorize={authorizeHotelPayment}
        onCancel={() => setPaying(false)}
        onClose={closeCheckout}
        onContinue={closeCheckout}
        continueLabel="See your stay"
        dashboardPath="/app/dashboard"
      />
    </div>
  )
}
