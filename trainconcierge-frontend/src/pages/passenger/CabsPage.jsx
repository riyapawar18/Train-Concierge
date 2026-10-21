/**
 * CabsPage — 5-step cab booking wizard
 *
 * Step 1  Trip details   — pickup / drop-off / date / time (pre-filled from train)
 * Step 2  Choose ride    — Bike / Auto / Mini / Sedan / SUV with fare + ETA
 * Step 3  Confirm        — fare breakdown + train booking association
 * Step 4  Confirmed      — reservation ID + simulated ride-status timeline
 * Step 5  My Cabs        — persisted reservation list (always visible at bottom)
 *
 * All fares and ETAs are illustrative demo values. Reservations are saved in
 * the MySQL database via Spring Boot and persist across page refreshes.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { cabApi, bookingApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import {
  Car, X, ArrowLeft, ArrowRight, Users, Briefcase,
  RefreshCw, MapPin, CheckCircle, AlertCircle,
  Clock, IndianRupee, ChevronRight, Star
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Constants & helpers ───────────────────────────────────────────────────────

const INR = (n) => `₹${Number(n).toLocaleString('en-IN')}`

/** Local "today" as YYYY-MM-DD (no UTC drift for IST users) */
const localToday = () => {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

/**
 * Ride category catalog — simulated fares and ETAs.
 * These are illustrative demo values, not real fares or live pickup times.
 */
const RIDE_OPTIONS = [
  {
    id:       'bike',
    label:    'Bike',
    icon:     '🏍️',
    capacity: 1,
    luggage:  1,
    vehicle:  'Hero Splendor / Similar',
    fare:     90,
    eta:      4,
    perKm:    8,
    desc:     'Quickest for solo riders with light bags',
    color:    'border-yellow-300 bg-yellow-50',
    badge:    'bg-yellow-100 text-yellow-800',
  },
  {
    id:       'auto',
    label:    'Auto',
    icon:     '🛺',
    capacity: 3,
    luggage:  2,
    vehicle:  'Auto Rickshaw',
    fare:     140,
    eta:      6,
    perKm:    12,
    desc:     'Affordable for short city hops',
    color:    'border-orange-300 bg-orange-50',
    badge:    'bg-orange-100 text-orange-800',
  },
  {
    id:       'mini',
    label:    'Mini',
    icon:     '🚗',
    capacity: 4,
    luggage:  2,
    vehicle:  'Maruti Swift / Similar',
    fare:     220,
    eta:      5,
    perKm:    14,
    desc:     'AC hatchback, great value',
    color:    'border-green-300 bg-green-50',
    badge:    'bg-green-100 text-green-800',
  },
  {
    id:       'sedan',
    label:    'Sedan',
    icon:     '🚙',
    capacity: 4,
    luggage:  3,
    vehicle:  'Honda City / Similar',
    fare:     320,
    eta:      7,
    perKm:    18,
    desc:     'Comfortable AC sedan',
    color:    'border-blue-300 bg-blue-50',
    badge:    'bg-blue-100 text-blue-800',
  },
  {
    id:       'suv',
    label:    'SUV',
    icon:     '🚐',
    capacity: 6,
    luggage:  5,
    vehicle:  'Toyota Innova / Similar',
    fare:     480,
    eta:      10,
    perKm:    22,
    desc:     'Spacious SUV for groups or heavy luggage',
    color:    'border-purple-300 bg-purple-50',
    badge:    'bg-purple-100 text-purple-800',
  },
]

/** Ride-status step definitions for the timeline display */
const RIDE_STEPS = [
  { key: 'DRIVER_ASSIGNED', label: 'Driver Assigned', icon: '👤' },
  { key: 'EN_ROUTE',        label: 'En Route',        icon: '🚗' },
  { key: 'ARRIVED',         label: 'Arrived',         icon: '📍' },
  { key: 'IN_PROGRESS',     label: 'Ride Started',    icon: '🛣️'  },
  { key: 'COMPLETED',       label: 'Completed',       icon: '✅' },
]

const STEP_ORDER = RIDE_STEPS.map(s => s.key)

/** Simulated driver names and number plates for demo reservations */
const DEMO_DRIVERS = [
  { name: 'Ramesh Kumar',  plate: 'MH12AB1234' },
  { name: 'Suresh Yadav',  plate: 'PB08CD5678' },
  { name: 'Ankit Sharma',  plate: 'DL01EF9012' },
  { name: 'Vijay Singh',   plate: 'KA09GH3456' },
  { name: 'Pradeep Nair',  plate: 'TN07IJ7890' },
]
const randomDriver = () => DEMO_DRIVERS[Math.floor(Math.random() * DEMO_DRIVERS.length)]

// ─── Main component ────────────────────────────────────────────────────────────

export default function CabsPage() {
  const [searchParams] = useSearchParams()

  // URL context from My Bookings
  const urlDest        = searchParams.get('destination') || ''
  const urlBookingId   = searchParams.get('bookingId')   || ''
  const urlTravelDate  = searchParams.get('travelDate')  || ''
  const urlArrivalTime = searchParams.get('arrivalTime') || ''

  const today = localToday()

  // ── Wizard state ──────────────────────────────────────────────────────────
  // step: 1 = trip details | 2 = choose ride | 3 = confirm | 4 = confirmed
  const [step, setStep]               = useState(1)
  const [tripDetails, setTripDetails] = useState({
    pickup:    urlDest ? `${urlDest} Railway Station` : '',
    dropoff:   '',
    date:      urlTravelDate || today,
    time:      urlArrivalTime ? urlArrivalTime.slice(0, 5) : '',
    passengers: 1,
  })
  const [tripError, setTripError]     = useState('')
  const [selectedRide, setSelectedRide] = useState(null)   // one of RIDE_OPTIONS
  const [linkedBookingId, setLinkedBookingId] = useState(urlBookingId || '')
  const [confirmedBookings, setConfirmedBookings] = useState([])
  const [loadingBookings, setLoadingBookings]     = useState(false)
  const [bookingsError, setBookingsError]         = useState('')
  const [submitting, setSubmitting]               = useState(false)
  const [submitError, setSubmitError]             = useState('')
  const [newReservation, setNewReservation]       = useState(null) // CabDto after confirm

  // ── My Cabs list (bottom section, always visible) ─────────────────────────
  const [myReservations, setMyReservations]   = useState([])
  const [loadingRes, setLoadingRes]           = useState(true)
  const [resError, setResError]               = useState('')

  const loadReservations = useCallback(() => {
    setLoadingRes(true)
    cabApi.getAll()
      .then(r => setMyReservations(r.data.data || []))
      .catch(err => setResError(err.response?.data?.error || 'Failed to load reservations.'))
      .finally(() => setLoadingRes(false))
  }, [])

  useEffect(() => { loadReservations() }, [loadReservations])

  // Load confirmed train bookings (for step 3 dropdown)
  const loadConfirmedBookings = useCallback(async () => {
    if (confirmedBookings.length > 0) return   // already loaded
    setLoadingBookings(true)
    setBookingsError('')
    try {
      const res = await bookingApi.getAll()
      setConfirmedBookings(res.data.data.filter(b => b.status === 'CONFIRMED'))
    } catch (err) {
      setBookingsError(err.response?.data?.error || 'Could not load bookings.')
    } finally {
      setLoadingBookings(false)
    }
  }, [confirmedBookings.length])

  // ── Step 1 → 2 ────────────────────────────────────────────────────────────
  const handleTripNext = (e) => {
    e?.preventDefault()
    if (!tripDetails.pickup.trim())  { setTripError('Enter a pickup location.'); return }
    if (!tripDetails.dropoff.trim()) { setTripError('Enter a drop-off location.'); return }
    if (!tripDetails.date)           { setTripError('Select a pickup date.'); return }
    setTripError('')
    setStep(2)
  }

  // ── Step 2 → 3 ────────────────────────────────────────────────────────────
  const handleSelectRide = async (ride) => {
    setSelectedRide(ride)
    await loadConfirmedBookings()
    setStep(3)
  }

  // ── Step 3 → 4 (submit) ───────────────────────────────────────────────────
  const handleConfirm = async (e) => {
    e?.preventDefault()
    if (!linkedBookingId) { setSubmitError('Please link a train booking.'); return }
    setSubmitError('')
    setSubmitting(true)
    const driver = randomDriver()
    try {
      const res = await cabApi.reserve({
        bookingId:       parseInt(linkedBookingId),
        cabType:         selectedRide.label,
        pickupLocation:  tripDetails.pickup,
        dropLocation:    tripDetails.dropoff,
        pickupDate:      tripDetails.date,
        pickupTime:      tripDetails.time || '08:00',
        fare:            selectedRide.fare,
        pickupEtaMinutes: selectedRide.eta,
        driverName:      driver.name,
        vehicleNumber:   driver.plate,
      })
      setNewReservation(res.data.data)
      setStep(4)
      loadReservations()
      toast.success('Cab booked! Your driver is on the way.')
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Booking failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Ride-status advance ───────────────────────────────────────────────────
  const handleAdvanceStatus = async (id) => {
    try {
      const res = await cabApi.advanceRideStatus(id)
      // Update both the confirmation view and My Cabs list
      setNewReservation(res.data.data)
      setMyReservations(prev =>
        prev.map(r => r.id === id ? res.data.data : r)
      )
      toast.success('Ride status updated.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status.')
    }
  }

  // ── Cancel a reservation ──────────────────────────────────────────────────
  const handleCancel = async (id) => {
    if (!confirm('Cancel this cab reservation?')) return
    try {
      await cabApi.cancel(id)
      toast.success('Reservation cancelled.')
      loadReservations()
      // If user is viewing the cancelled reservation in step 4, refresh it
      if (newReservation?.id === id) {
        setNewReservation(prev => ({ ...prev, status: 'CANCELLED', rideStatus: 'CANCELLED' }))
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel.')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-sm text-gray-500">
        <Link to="/bookings" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> My Bookings
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Book a Cab</span>
        {urlDest && <><span>/</span><span className="text-blue-600">{urlDest}</span></>}
      </div>

      {/* ── Progress indicator ── */}
      {step < 4 && <WizardProgress step={step} />}

      {/* ── Demo notice ── */}
      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200
                      rounded-lg px-3 py-2 mb-5">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Fares, driver details, and ETAs are <strong>illustrative demo values</strong>.
          Reservations are saved in the database and persist after refresh.
        </span>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          STEP 1 — Trip details
      ════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" /> Trip Details
          </h2>
          {urlDest && (
            <p className="text-sm text-gray-500 mb-4">
              From <span className="font-medium text-gray-800">{urlDest} Railway Station</span>
              {urlArrivalTime && (
                <span className="ml-2 text-blue-600">
                  · Train arrives {urlArrivalTime.slice(0, 5)}
                </span>
              )}
              {urlBookingId && (
                <span className="ml-2 text-gray-400">· Booking #{urlBookingId}</span>
              )}
            </p>
          )}

          {tripError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {tripError}
            </div>
          )}

          <form onSubmit={handleTripNext} className="space-y-4">
            <div>
              <label className="label" htmlFor="pickup">
                Pickup Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                <input id="pickup" className="input pl-9"
                  type="text" placeholder="e.g., Pune Railway Station"
                  value={tripDetails.pickup}
                  onChange={e => setTripDetails({ ...tripDetails, pickup: e.target.value })}
                  required aria-label="Pickup location" />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="dropoff">
                Drop-off Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                <input id="dropoff" className="input pl-9"
                  type="text" placeholder="e.g., Hinjawadi, Pune"
                  value={tripDetails.dropoff}
                  onChange={e => setTripDetails({ ...tripDetails, dropoff: e.target.value })}
                  required aria-label="Drop-off location" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="pickup-date">Pickup Date *</label>
                <input id="pickup-date" className="input" type="date"
                  value={tripDetails.date} min={today}
                  onChange={e => setTripDetails({ ...tripDetails, date: e.target.value })}
                  required aria-label="Pickup date" />
              </div>
              <div>
                <label className="label" htmlFor="pickup-time">
                  Pickup Time
                  {urlArrivalTime && (
                    <span className="ml-1 text-xs text-blue-600 font-normal">
                      (pre-filled from train)
                    </span>
                  )}
                </label>
                <input id="pickup-time" className="input" type="time"
                  value={tripDetails.time}
                  onChange={e => setTripDetails({ ...tripDetails, time: e.target.value })}
                  aria-label="Pickup time" />
                {!urlArrivalTime && (
                  <p className="text-xs text-gray-400 mt-1">
                    Train arrival not available — please enter a time.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="passengers">Passengers</label>
              <input id="passengers" className="input" type="number"
                min={1} max={6} value={tripDetails.passengers}
                onChange={e => setTripDetails({ ...tripDetails, passengers: parseInt(e.target.value) || 1 })}
                aria-label="Number of passengers" />
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
              See Available Rides <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STEP 2 — Choose ride category
      ════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Choose Your Ride</h2>
            <button className="btn-secondary text-xs" onClick={() => setStep(1)}>
              ← Edit Trip
            </button>
          </div>

          {/* Trip summary chip */}
          <TripSummaryChip details={tripDetails} />

          <div className="space-y-3 mt-4">
            {RIDE_OPTIONS
              .filter(r => r.capacity >= tripDetails.passengers)
              .map(ride => (
                <RideOptionCard
                  key={ride.id}
                  ride={ride}
                  onSelect={() => handleSelectRide(ride)}
                />
              ))
            }
            {RIDE_OPTIONS.filter(r => r.capacity < tripDetails.passengers).length > 0 && (
              <p className="text-xs text-center text-gray-400 pt-1">
                {RIDE_OPTIONS.filter(r => r.capacity < tripDetails.passengers).length} option(s)
                hidden — insufficient capacity for {tripDetails.passengers} passenger(s).
              </p>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STEP 3 — Confirm booking
      ════════════════════════════════════════════════════════════════════ */}
      {step === 3 && selectedRide && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" /> Confirm Booking
            </h2>
            <button className="btn-secondary text-xs" onClick={() => setStep(2)}>
              ← Change Ride
            </button>
          </div>

          {/* Ride + trip summary */}
          <div className={`rounded-lg border p-4 mb-4 ${selectedRide.color}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{selectedRide.icon}</span>
              <div>
                <p className="font-bold text-gray-900">{selectedRide.label}</p>
                <p className="text-xs text-gray-600">{selectedRide.vehicle}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-bold text-lg text-gray-900">{INR(selectedRide.fare)}</p>
                <p className="text-xs text-gray-500">est. fare (demo)</p>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div><span className="text-gray-500 text-xs">Pickup</span><br />
                  <span className="font-medium">{tripDetails.pickup}</span></div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div><span className="text-gray-500 text-xs">Drop-off</span><br />
                  <span className="font-medium">{tripDetails.dropoff}</span></div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4 text-gray-400" />
                {tripDetails.date}{tripDetails.time ? ` at ${tripDetails.time}` : ''}
                <span className="ml-2 text-blue-700 font-medium text-xs">
                  · ETA {selectedRide.eta} min (demo)
                </span>
              </div>
            </div>
          </div>

          {/* Fare breakdown */}
          <FareBreakdown ride={selectedRide} />

          {/* Link to train booking */}
          <div className="mt-4">
            <label className="label" htmlFor="link-booking">
              Link to Train Booking *
            </label>
            {loadingBookings ? (
              <p className="text-sm text-gray-500 py-2">Loading your train bookings…</p>
            ) : bookingsError ? (
              <p className="text-sm text-red-600">{bookingsError}</p>
            ) : (
              <select id="link-booking" className="input"
                value={linkedBookingId}
                onChange={e => setLinkedBookingId(e.target.value)}
                required aria-label="Link to train booking">
                <option value="">Select a confirmed train booking</option>
                {confirmedBookings.map(b => (
                  <option key={b.id} value={b.id}>
                    #{b.id} · {b.trainName} · {b.fromStation} → {b.toStation} · {b.travelDate}
                  </option>
                ))}
              </select>
            )}
          </div>

          {submitError && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {submitError}
            </div>
          )}

          <button
            className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
            onClick={handleConfirm}
            disabled={submitting || !linkedBookingId}
          >
            {submitting
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Confirming…</>
              : <><CheckCircle className="h-4 w-4" /> Confirm & Book</>}
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STEP 4 — Reservation confirmed + ride-status timeline
      ════════════════════════════════════════════════════════════════════ */}
      {step === 4 && newReservation && (
        <ReservationConfirmed
          reservation={newReservation}
          ride={selectedRide}
          trip={tripDetails}
          onAdvance={() => handleAdvanceStatus(newReservation.id)}
          onCancel={() => handleCancel(newReservation.id)}
          onNewBooking={() => {
            setStep(1)
            setSelectedRide(null)
            setNewReservation(null)
            setLinkedBookingId(urlBookingId || '')
            setTripDetails({
              pickup: urlDest ? `${urlDest} Railway Station` : '',
              dropoff: '', date: urlTravelDate || today, time: urlArrivalTime?.slice(0, 5) || '', passengers: 1,
            })
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          My Cab Reservations — always visible below the wizard
      ════════════════════════════════════════════════════════════════════ */}
      <MyCabsList
        reservations={myReservations}
        loading={loadingRes}
        error={resError}
        onRefresh={loadReservations}
        onCancel={handleCancel}
        onAdvance={handleAdvanceStatus}
        activeId={newReservation?.id}
      />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function WizardProgress({ step }) {
  const steps = ['Trip Details', 'Choose Ride', 'Confirm']
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((label, i) => {
        const n     = i + 1
        const done  = step > n
        const active = step === n
        return (
          <div key={n} className="flex items-center gap-1 flex-1 last:flex-none">
            <div className={`flex items-center gap-1.5 text-xs font-medium
              ${active ? 'text-blue-700' : done ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${active ? 'bg-blue-600 text-white' : done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {done ? '✓' : n}
              </span>
              <span className="hidden sm:block">{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 ${step > n ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function TripSummaryChip({ details }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm space-y-1">
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
        <span className="text-gray-500 text-xs w-16">Pickup</span>
        <span className="font-medium text-gray-800 truncate">{details.pickup}</span>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
        <span className="text-gray-500 text-xs w-16">Drop-off</span>
        <span className="font-medium text-gray-800 truncate">{details.dropoff}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-gray-500 text-xs w-16">Time</span>
        <span className="font-medium text-gray-800">
          {details.date}{details.time ? ` at ${details.time}` : ''}
        </span>
      </div>
    </div>
  )
}

function RideOptionCard({ ride, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left card border-2 hover:shadow-md transition-all
                  hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400
                  ${ride.color}`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <span className="text-3xl flex-shrink-0" role="img" aria-label={ride.label}>
          {ride.icon}
        </span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-gray-900 text-base">{ride.label}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ride.badge}`}>
              {ride.vehicle.split('/')[0].trim()}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{ride.desc}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3 text-gray-400" /> {ride.capacity}
            </span>
            <span className="flex items-center gap-0.5">
              <Briefcase className="h-3 w-3 text-gray-400" /> {ride.luggage} bags
            </span>
          </div>
        </div>

        {/* Fare + ETA */}
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-lg text-gray-900">{INR(ride.fare)}</p>
          <p className="text-xs text-gray-500">est. fare</p>
          <p className="text-xs text-blue-600 font-medium mt-0.5">{ride.eta} min ETA</p>
        </div>

        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
      </div>
    </button>
  )
}

function FareBreakdown({ ride }) {
  const tax = Math.round(ride.fare * 0.05)
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
      <p className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wide">
        Fare Breakdown <span className="text-amber-600 font-normal normal-case">(demo estimates)</span>
      </p>
      <div className="space-y-1 text-gray-600">
        <Row l="Base fare"     r={INR(ride.fare - Math.round(ride.fare * 0.12) - tax)} />
        <Row l="Distance fare" r={INR(Math.round(ride.fare * 0.12))} />
        <Row l="Taxes & fees (5%)" r={INR(tax)} />
        <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
          <span>Estimated Total</span>
          <span>{INR(ride.fare)}</span>
        </div>
      </div>
    </div>
  )
}

function Row({ l, r }) {
  return (
    <div className="flex justify-between">
      <span>{l}</span><span>{r}</span>
    </div>
  )
}

function ReservationConfirmed({ reservation, ride, trip, onAdvance, onCancel, onNewBooking }) {
  const currentIdx = STEP_ORDER.indexOf(reservation.rideStatus)
  const isTerminal = reservation.rideStatus === 'COMPLETED' || reservation.status === 'CANCELLED'
  const isCancelled = reservation.status === 'CANCELLED'

  return (
    <div className="space-y-4">
      {/* Confirmation header */}
      <div className="card border-2 border-green-300 bg-green-50 text-center">
        <div className="flex justify-center mb-3">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-green-900">Ride Booked!</h2>
        <p className="text-sm text-green-700 mt-1">Reservation #{reservation.id}</p>
        {ride && (
          <p className="text-2xl mt-2">{ride.icon}</p>
        )}
        <p className="font-semibold text-gray-800 mt-1">
          {reservation.cabType} · {INR(reservation.fare)}
        </p>
      </div>

      {/* Driver info */}
      {reservation.driverName && (
        <div className="card flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Star className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">{reservation.driverName}</p>
            <p className="text-xs text-gray-500">{reservation.vehicleNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">ETA</p>
            <p className="font-bold text-blue-700">{reservation.pickupEtaMinutes} min</p>
            <p className="text-xs text-amber-600">(demo)</p>
          </div>
        </div>
      )}

      {/* Trip summary */}
      <div className="card text-sm space-y-2">
        <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1">
          Trip Summary
        </p>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          <div><span className="text-xs text-gray-400">Pickup</span><br />
            <span className="font-medium">{reservation.pickupLocation}</span></div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div><span className="text-xs text-gray-400">Drop-off</span><br />
            <span className="font-medium">{reservation.dropLocation}</span></div>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="h-4 w-4 text-gray-400" />
          {reservation.pickupDate}
          {reservation.pickupTime ? ` at ${reservation.pickupTime}` : ''}
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <IndianRupee className="h-4 w-4 text-gray-400" />
          <span className="font-medium">Fare: {INR(reservation.fare)}</span>
          <span className="text-xs text-gray-400">(demo estimate)</span>
        </div>
        <p className="text-xs text-gray-400">
          Linked to Train Booking #{reservation.bookingId}
        </p>
      </div>

      {/* Ride-status timeline */}
      <div className="card">
        <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-4">
          Ride Status {isCancelled && <span className="text-red-500 ml-2">(Cancelled)</span>}
        </p>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
          <div className="space-y-4">
            {RIDE_STEPS.map((s, i) => {
              const done    = !isCancelled && currentIdx >= i
              const current = !isCancelled && currentIdx === i
              return (
                <div key={s.key} className="flex items-center gap-3 relative">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm z-10
                    ${isCancelled ? 'bg-gray-100 text-gray-400'
                      : done ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-400'}`}>
                    {done && !current ? '✓' : s.icon}
                  </div>
                  <span className={`text-sm ${current ? 'font-bold text-blue-700' : done ? 'text-green-700' : 'text-gray-400'}`}>
                    {s.label}
                    {current && !isCancelled && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Now</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Advance button */}
        {!isTerminal && !isCancelled && (
          <button
            className="mt-4 w-full btn-secondary text-sm flex items-center justify-center gap-2"
            onClick={onAdvance}
          >
            <ArrowRight className="h-4 w-4" />
            Simulate Next Status
          </button>
        )}
        {reservation.rideStatus === 'COMPLETED' && (
          <p className="mt-3 text-center text-green-700 font-semibold text-sm">
            🎉 Ride completed!
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="btn-primary flex-1" onClick={onNewBooking}>
          Book Another Cab
        </button>
        {!isTerminal && !isCancelled && (
          <button className="btn-danger flex-1" onClick={onCancel}>
            Cancel Ride
          </button>
        )}
      </div>
    </div>
  )
}

function MyCabsList({ reservations, loading, error, onRefresh, onCancel, onAdvance, activeId }) {
  return (
    <div className="mt-12 border-t border-gray-200 pt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Car className="h-5 w-5 text-blue-600" /> My Cab Reservations
        </h2>
        <button className="btn-secondary text-xs flex items-center gap-1" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading && <LoadingSpinner text="Loading reservations…" />}
      {error && <ErrorMessage message={error} onRetry={onRefresh} />}

      {!loading && !error && reservations.length === 0 && (
        <EmptyState
          icon={Car}
          title="No cab reservations yet"
          description="Book a cab using the form above."
        />
      )}

      {!loading && reservations.length > 0 && (
        <div className="space-y-3">
          {reservations.map(c => (
            <CabReservationCard
              key={c.id}
              reservation={c}
              isActive={c.id === activeId}
              onCancel={() => onCancel(c.id)}
              onAdvance={() => onAdvance(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CabReservationCard({ reservation: c, isActive, onCancel, onAdvance }) {
  const currentIdx  = STEP_ORDER.indexOf(c.rideStatus)
  const isCompleted = c.rideStatus === 'COMPLETED'
  const isCancelled = c.status === 'CANCELLED'
  const isTerminal  = isCompleted || isCancelled
  const currentStep = RIDE_STEPS[currentIdx]

  const ICONS = {
    'Bike':  '🏍️', 'Auto': '🛺', 'Mini': '🚗',
    'Sedan': '🚙', 'SUV':  '🚐', 'Premium': '🏎️',
    'Economy': '🚗', 'Auto Rickshaw': '🛺',
  }

  return (
    <div className={`card transition-shadow ${isActive ? 'ring-2 ring-blue-400' : ''} ${isCancelled ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-lg">{ICONS[c.cabType] || '🚗'}</span>
            <span className="font-semibold text-gray-900">{c.cabType}</span>
            <StatusBadge status={c.status} />
            {c.rideStatus && !isCancelled && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${isCompleted ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'}`}>
                {currentStep?.label ?? c.rideStatus.replace('_', ' ')}
              </span>
            )}
            {isActive && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>

          {/* Route */}
          <p className="text-sm text-gray-600 flex items-center gap-1 truncate">
            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            {c.pickupLocation} → {c.dropLocation}
          </p>

          {/* Date + time */}
          <p className="text-xs text-gray-500 mt-0.5">
            {c.pickupDate}{c.pickupTime ? ` at ${c.pickupTime}` : ''}
            {c.driverName && (
              <span className="ml-2 text-gray-400">· {c.driverName} · {c.vehicleNumber}</span>
            )}
          </p>

          {/* Fare + train link */}
          <p className="text-sm font-medium text-gray-800 mt-1">
            {INR(c.fare)}
            <span className="text-xs text-gray-400 font-normal ml-2">
              · Train Booking #{c.bookingId}
            </span>
          </p>
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            {!isTerminal && (
              <>
                <button
                  onClick={onAdvance}
                  title="Simulate next ride status"
                  className="btn-secondary text-xs px-2 py-1">
                  Next →
                </button>
                <button
                  onClick={onCancel}
                  className="text-red-500 hover:text-red-700 p-1"
                  aria-label={`Cancel reservation #${c.id}`}>
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
