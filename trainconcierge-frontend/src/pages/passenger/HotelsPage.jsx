import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { hotelApi, bookingApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import {
  Hotel, Plus, X, ArrowLeft, Star, MapPin, Wifi, Coffee,
  Dumbbell, Waves, ChevronDown, ChevronUp, Filter, SortAsc,
  CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Helpers ───────────────────────────────────────────────────────────────────

const INR = (n) => `₹${Number(n).toLocaleString('en-IN')}`

const AMENITY_ICONS = {
  WiFi: <Wifi className="h-3 w-3" />,
  Pool: <Waves className="h-3 w-3" />,
  Gym: <Dumbbell className="h-3 w-3" />,
  Restaurant: <Coffee className="h-3 w-3" />
}

const SORT_OPTIONS = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating_desc', label: 'Rating: Best First' },
  { value: 'name_asc', label: 'Name: A–Z' }
]

function sortResults(items, sortBy) {
  const arr = [...items]
  switch (sortBy) {
    case 'price_asc': return arr.sort((a, b) => a.pricePerNight - b.pricePerNight)
    case 'price_desc': return arr.sort((a, b) => b.pricePerNight - a.pricePerNight)
    case 'rating_desc': return arr.sort((a, b) => b.rating - a.rating)
    case 'name_asc': return arr.sort((a, b) => a.hotelName.localeCompare(b.hotelName))
    default: return arr
  }
}

function filterResults(items, { priceMax, minRating, amenity }) {
  return items.filter(h => {
    if (priceMax && h.pricePerNight > priceMax) return false
    if (minRating && h.rating < minRating) return false
    if (amenity && !h.amenities?.includes(amenity)) return false
    return true
  })
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function HotelsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // URL params (restored on refresh)
  const urlDestination = searchParams.get('destination') || ''
  const urlBookingId   = searchParams.get('bookingId')   || ''
  const urlTravelDate  = searchParams.get('travelDate')  || ''

  // ── Search form state ──────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const [city, setCity]         = useState(urlDestination)
  const [checkIn, setCheckIn]   = useState(urlTravelDate || today)
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests]     = useState(1)
  const [rooms, setRooms]       = useState(1)
  const [nameFilter, setNameFilter] = useState('')

  // ── Results state ─────────────────────────────────────────────────────────
  const [results, setResults]       = useState([])
  const [searched, setSearched]     = useState(false)
  const [searching, setSearching]   = useState(false)
  const [searchError, setSearchError] = useState('')

  // ── Filters / sort ────────────────────────────────────────────────────────
  const [sortBy, setSortBy]         = useState('price_asc')
  const [filterPriceMax, setFilterPriceMax] = useState('')
  const [filterRating, setFilterRating]     = useState('')
  const [filterAmenity, setFilterAmenity]   = useState('')
  const [showFilters, setShowFilters]       = useState(false)

  // ── Booking modal ─────────────────────────────────────────────────────────
  const [selectedHotel, setSelectedHotel] = useState(null)
  const [bookingForm, setBookingForm]     = useState(null)
  const [confirmedBookings, setConfirmedBookings] = useState([])
  const [loadingBookings, setLoadingBookings]     = useState(false)
  const [bookingsError, setBookingsError]         = useState('')
  const [submitting, setSubmitting]               = useState(false)
  const [formError, setFormError]                 = useState('')

  // ── My reservations (bottom of page) ──────────────────────────────────────
  const [myReservations, setMyReservations] = useState([])
  const [loadingReservations, setLoadingReservations] = useState(true)
  const [reservationsError, setReservationsError]     = useState('')

  // ── Load my existing reservations ─────────────────────────────────────────
  const loadReservations = useCallback(() => {
    setLoadingReservations(true)
    hotelApi.getAll()
      .then(r => setMyReservations(r.data.data))
      .catch(err => setReservationsError(err.response?.data?.error || 'Failed to load reservations.'))
      .finally(() => setLoadingReservations(false))
  }, [])

  useEffect(() => { loadReservations() }, [loadReservations])

  // Auto-search if destination arrived via URL
  useEffect(() => {
    if (urlDestination) {
      handleSearch(urlDestination)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (searchCity = city) => {
    const target = searchCity.trim()
    if (!target) return
    setSearching(true)
    setSearchError('')
    setSearched(false)
    try {
      const res = await hotelApi.search(target)
      let items = res.data.data || []
      if (nameFilter) {
        items = items.filter(h =>
          h.hotelName.toLowerCase().includes(nameFilter.toLowerCase()) ||
          h.locality?.toLowerCase().includes(nameFilter.toLowerCase())
        )
      }
      setResults(items)
      setSearched(true)
    } catch (err) {
      setSearchError(err.response?.data?.error || 'Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    // Validate dates
    if (checkOut && checkIn >= checkOut) {
      setSearchError('Check-out date must be after check-in date.')
      return
    }
    setSearchError('')
    handleSearch(city)
  }

  // ── Open booking modal ────────────────────────────────────────────────────
  const openBooking = async (hotel) => {
    setSelectedHotel(hotel)
    setFormError('')
    // Pre-fill from URL context
    const nextDay = checkIn
      ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0]
      : ''
    setBookingForm({
      bookingId: urlBookingId || '',
      hotelName: hotel.hotelName,
      city: hotel.city,
      checkIn: checkIn || today,
      checkOut: checkOut || nextDay,
      rooms,
      pricePerNight: hotel.pricePerNight
    })
    // Load confirmed bookings for the dropdown if not pre-filled
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
  }

  // ── Submit reservation ────────────────────────────────────────────────────
  const handleBooking = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!bookingForm.bookingId) { setFormError('Please select a train booking to link this reservation.'); return }
    if (!bookingForm.checkIn || !bookingForm.checkOut) { setFormError('Please set check-in and check-out dates.'); return }
    if (bookingForm.checkIn >= bookingForm.checkOut) { setFormError('Check-out must be after check-in.'); return }
    setSubmitting(true)
    try {
      await hotelApi.reserve({
        bookingId: parseInt(bookingForm.bookingId),
        hotelName: bookingForm.hotelName,
        city: bookingForm.city,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        rooms: parseInt(bookingForm.rooms),
        pricePerNight: parseFloat(bookingForm.pricePerNight)
      })
      const nights = Math.round(
        (new Date(bookingForm.checkOut) - new Date(bookingForm.checkIn)) / 86400000
      )
      toast.success(`${bookingForm.hotelName} booked for ${nights} night(s)!`)
      setSelectedHotel(null)
      setBookingForm(null)
      loadReservations()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Reservation failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Cancel reservation ────────────────────────────────────────────────────
  const handleCancel = async (id) => {
    if (!confirm('Cancel this hotel reservation?')) return
    try {
      await hotelApi.cancel(id)
      toast.success('Hotel reservation cancelled.')
      loadReservations()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel.')
    }
  }

  // ── Derived display data ──────────────────────────────────────────────────
  const displayResults = sortResults(
    filterResults(results, {
      priceMax: filterPriceMax ? parseFloat(filterPriceMax) : null,
      minRating: filterRating ? parseFloat(filterRating) : null,
      amenity: filterAmenity || null
    }),
    sortBy
  )

  const nights = (checkIn && checkOut && checkIn < checkOut)
    ? Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000)
    : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-8 px-4">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <Link to="/bookings" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> My Bookings
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Hotels</span>
        {urlDestination && (
          <>
            <span>/</span>
            <span className="text-blue-600 font-medium">{urlDestination}</span>
          </>
        )}
      </div>

      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Hotel className="h-6 w-6 text-blue-600" />
            Hotel Discovery
          </h1>
          {urlDestination && (
            <p className="text-sm text-gray-500 mt-1">
              Showing hotels near <span className="font-medium text-gray-700">{urlDestination}</span>
              {urlBookingId && <span className="ml-2 text-blue-600">· Booking #{urlBookingId}</span>}
            </p>
          )}
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Demo data — prices and availability are simulated
          </p>
        </div>
      </div>

      {/* ── Search Form ── */}
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Search Hotels</h2>
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="label" htmlFor="city-input">Destination City</label>
            <input
              id="city-input"
              className="input"
              type="text"
              placeholder="e.g., Delhi, Mumbai, Pune…"
              value={city}
              onChange={e => setCity(e.target.value)}
              required
              aria-label="Destination city"
            />
          </div>
          <div>
            <label className="label" htmlFor="checkin">Check-in Date</label>
            <input id="checkin" className="input" type="date" value={checkIn}
              min={today}
              onChange={e => setCheckIn(e.target.value)}
              aria-label="Check-in date" />
          </div>
          <div>
            <label className="label" htmlFor="checkout">Check-out Date</label>
            <input id="checkout" className="input" type="date" value={checkOut}
              min={checkIn || today}
              onChange={e => setCheckOut(e.target.value)}
              aria-label="Check-out date" />
          </div>
          <div>
            <label className="label" htmlFor="guests">Guests</label>
            <input id="guests" className="input" type="number" min={1} max={10} value={guests}
              onChange={e => setGuests(parseInt(e.target.value))}
              aria-label="Number of guests" />
          </div>
          <div>
            <label className="label" htmlFor="rooms">Rooms</label>
            <input id="rooms" className="input" type="number" min={1} max={10} value={rooms}
              onChange={e => setRooms(parseInt(e.target.value))}
              aria-label="Number of rooms" />
          </div>
          <div>
            <label className="label" htmlFor="name-filter">Hotel Name / Locality</label>
            <input id="name-filter" className="input" type="text" placeholder="Optional"
              value={nameFilter} onChange={e => setNameFilter(e.target.value)}
              aria-label="Filter by hotel name or locality" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            {searchError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded p-2.5 text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {searchError}
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={searching || !city.trim()}>
              {searching ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Searching…
                </span>
              ) : 'Search Hotels'}
            </button>
          </div>
        </form>

        {/* Missing destination fallback */}
        {!urlDestination && !city && (
          <p className="mt-3 text-sm text-gray-500 text-center">
            No destination pre-filled.{' '}
            <Link to="/bookings" className="text-blue-600 hover:underline">
              Go to My Bookings
            </Link>{' '}
            and click Hotel on a booking to auto-populate.
          </p>
        )}
      </div>

      {/* ── Results Section ── */}
      {searching && <LoadingSpinner text="Searching hotels…" />}

      {!searching && searched && (
        <div className="mb-6">
          {/* Results header + sort/filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-gray-600">
              {displayResults.length === 0
                ? `No hotels found in "${city}"${nameFilter ? ` matching "${nameFilter}"` : ''}`
                : `${displayResults.length} hotel${displayResults.length > 1 ? 's' : ''} in ${city}`
              }
              {nights > 0 && displayResults.length > 0 && (
                <span className="ml-2 text-gray-400">· {nights} night(s)</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(f => !f)}
                className="btn-secondary text-xs flex items-center gap-1"
                aria-expanded={showFilters}
              >
                <Filter className="h-3 w-3" />
                Filters
                {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <div className="flex items-center gap-1.5">
                <SortAsc className="h-3.5 w-3.5 text-gray-500" />
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  aria-label="Sort results"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="card mb-4 bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Max Price / Night (₹)</label>
                  <input className="input" type="number" min={0} placeholder="No limit"
                    value={filterPriceMax}
                    onChange={e => setFilterPriceMax(e.target.value)}
                    aria-label="Maximum price per night" />
                </div>
                <div>
                  <label className="label">Min Rating</label>
                  <select className="input" value={filterRating}
                    onChange={e => setFilterRating(e.target.value)}
                    aria-label="Minimum rating">
                    <option value="">Any</option>
                    <option value="3">3+</option>
                    <option value="3.5">3.5+</option>
                    <option value="4">4+</option>
                    <option value="4.5">4.5+</option>
                  </select>
                </div>
                <div>
                  <label className="label">Amenity</label>
                  <select className="input" value={filterAmenity}
                    onChange={e => setFilterAmenity(e.target.value)}
                    aria-label="Filter by amenity">
                    <option value="">Any</option>
                    {['WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant'].map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                className="mt-3 text-xs text-red-500 hover:text-red-700"
                onClick={() => { setFilterPriceMax(''); setFilterRating(''); setFilterAmenity('') }}
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Empty results */}
          {displayResults.length === 0 && (
            <EmptyState
              icon={Hotel}
              title={`No hotels found in ${city}`}
              description="Try a different city name, remove filters, or go back and select another booking."
              action={
                <button className="btn-secondary text-sm" onClick={() => { setResults([]); setSearched(false) }}>
                  Clear Results
                </button>
              }
            />
          )}

          {/* Hotel cards */}
          <div className="space-y-4">
            {displayResults.map(hotel => (
              <HotelCard
                key={hotel.catalogId}
                hotel={hotel}
                nights={nights}
                rooms={rooms}
                onBook={() => openBooking(hotel)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Booking Modal ── */}
      {selectedHotel && bookingForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 id="modal-title" className="text-lg font-bold text-gray-900">
                    Book {selectedHotel.hotelName}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedHotel.city} · {selectedHotel.locality}</p>
                </div>
                <button
                  onClick={() => { setSelectedHotel(null); setBookingForm(null); setFormError('') }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Close booking form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleBooking} className="space-y-4">
                {/* Booking link */}
                <div>
                  <label className="label" htmlFor="booking-select">Link to Train Booking *</label>
                  {loadingBookings ? (
                    <div className="text-sm text-gray-500 py-2">Loading your bookings…</div>
                  ) : bookingsError ? (
                    <div className="text-sm text-red-600">{bookingsError}</div>
                  ) : (
                    <select
                      id="booking-select"
                      className="input"
                      value={bookingForm.bookingId}
                      onChange={e => setBookingForm({ ...bookingForm, bookingId: e.target.value })}
                      required
                      aria-label="Select train booking"
                    >
                      <option value="">Select a confirmed train booking</option>
                      {confirmedBookings.map(b => (
                        <option key={b.id} value={b.id}>
                          #{b.id} · {b.trainName} · {b.fromStation} → {b.toStation} · {b.travelDate}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="modal-checkin">Check-in *</label>
                    <input id="modal-checkin" className="input" type="date"
                      value={bookingForm.checkIn}
                      min={today}
                      onChange={e => setBookingForm({ ...bookingForm, checkIn: e.target.value })}
                      required
                      aria-label="Check-in date" />
                  </div>
                  <div>
                    <label className="label" htmlFor="modal-checkout">Check-out *</label>
                    <input id="modal-checkout" className="input" type="date"
                      value={bookingForm.checkOut}
                      min={bookingForm.checkIn || today}
                      onChange={e => setBookingForm({ ...bookingForm, checkOut: e.target.value })}
                      required
                      aria-label="Check-out date" />
                  </div>
                </div>

                {/* Rooms */}
                <div>
                  <label className="label" htmlFor="modal-rooms">Number of Rooms</label>
                  <input id="modal-rooms" className="input" type="number" min={1} max={10}
                    value={bookingForm.rooms}
                    onChange={e => setBookingForm({ ...bookingForm, rooms: parseInt(e.target.value) })}
                    aria-label="Number of rooms" />
                </div>

                {/* Price breakdown */}
                <BookingPriceSummary form={bookingForm} />

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Confirming…
                    </span>
                  ) : 'Confirm Reservation'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── My Reservations ── */}
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            My Hotel Reservations
          </h2>
          <button onClick={loadReservations} className="btn-secondary text-xs flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {loadingReservations && <LoadingSpinner text="Loading reservations…" />}
        {reservationsError && <ErrorMessage message={reservationsError} onRetry={loadReservations} />}

        {!loadingReservations && !reservationsError && myReservations.length === 0 && (
          <EmptyState
            icon={Hotel}
            title="No hotel reservations yet"
            description="Search for hotels above and make a reservation."
          />
        )}

        {!loadingReservations && myReservations.length > 0 && (
          <div className="space-y-3">
            {myReservations.map(h => (
              <div key={h.id} className="card">
                <div className="flex justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Hotel className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="font-semibold">{h.hotelName}</span>
                      <StatusBadge status={h.status} />
                      <span className="text-xs text-gray-400">Booking #{h.bookingId}</span>
                    </div>
                    <p className="text-sm text-gray-600">{h.city}</p>
                    <p className="text-sm text-gray-600">
                      {h.checkIn} → {h.checkOut}
                      {h.checkIn && h.checkOut && (
                        <span className="ml-1 text-gray-400">
                          ({Math.round((new Date(h.checkOut) - new Date(h.checkIn)) / 86400000)} night(s))
                        </span>
                      )}
                      {' · '}{h.rooms} room(s)
                    </p>
                    <p className="text-sm font-medium text-gray-800 mt-1">
                      {INR(h.pricePerNight)}/night · Total: {INR(h.totalAmount)}
                    </p>
                  </div>
                  {h.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCancel(h.id)}
                      className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                      aria-label={`Cancel reservation at ${h.hotelName}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Hotel Result Card ─────────────────────────────────────────────────────────

function HotelCard({ hotel, nights, rooms, onBook }) {
  const [expanded, setExpanded] = useState(false)
  const estimatedTotal = nights > 0 ? hotel.pricePerNight * nights * rooms : null

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1">
          {/* Name + rating */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{hotel.hotelName}</span>
            {hotel.isDemo && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                Demo
              </span>
            )}
            <span className="flex items-center gap-0.5 text-yellow-500 text-sm font-medium">
              <Star className="h-3.5 w-3.5 fill-yellow-400" />
              {hotel.rating?.toFixed(1)}
              <span className="text-gray-400 font-normal ml-1">({hotel.reviewCount?.toLocaleString()} reviews)</span>
            </span>
          </div>

          {/* Location */}
          <p className="flex items-center gap-1 text-sm text-gray-600 mb-2">
            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            {hotel.locality} · {hotel.address}
          </p>

          {/* Room type */}
          <p className="text-xs text-gray-500 mb-2">
            {hotel.roomType} · Up to {hotel.maxOccupancy} guest(s)
          </p>

          {/* Amenities */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {hotel.amenities?.slice(0, expanded ? undefined : 4).map(a => (
              <span key={a} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {AMENITY_ICONS[a] || null}
                {a}
              </span>
            ))}
            {!expanded && hotel.amenities?.length > 4 && (
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setExpanded(true)}
              >
                +{hotel.amenities.length - 4} more
              </button>
            )}
          </div>

          {/* Availability */}
          <span className={`text-xs font-medium ${hotel.available ? 'text-green-600' : 'text-red-600'}`}>
            {hotel.available ? '✓ Available (demo)' : '✗ Not available'}
          </span>
        </div>

        {/* Price + CTA */}
        <div className="flex flex-col items-end justify-between gap-3 sm:min-w-[140px]">
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">{INR(hotel.pricePerNight)}</p>
            <p className="text-xs text-gray-500">per night</p>
            {estimatedTotal && (
              <p className="text-sm text-gray-600 mt-1">
                ~{INR(estimatedTotal)} for {nights} night{nights > 1 ? 's' : ''}
                {rooms > 1 ? `, ${rooms} rooms` : ''}
              </p>
            )}
          </div>
          <button
            className="btn-primary text-sm w-full"
            onClick={onBook}
            disabled={!hotel.available}
          >
            Book Hotel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Price Summary in Modal ────────────────────────────────────────────────────

function BookingPriceSummary({ form }) {
  if (!form.checkIn || !form.checkOut || form.checkIn >= form.checkOut) return null
  const nights = Math.round((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000)
  if (nights <= 0) return null
  const total = form.pricePerNight * nights * (form.rooms || 1)
  return (
    <div className="bg-blue-50 rounded-lg p-3 text-sm">
      <p className="font-medium text-blue-800 mb-2">Price Breakdown (Demo)</p>
      <div className="space-y-1 text-blue-700">
        <div className="flex justify-between">
          <span>Rate</span>
          <span>{INR(form.pricePerNight)}/night</span>
        </div>
        <div className="flex justify-between">
          <span>Nights</span>
          <span>{nights}</span>
        </div>
        <div className="flex justify-between">
          <span>Rooms</span>
          <span>{form.rooms}</span>
        </div>
        <div className="flex justify-between font-bold border-t border-blue-200 pt-1 mt-1 text-blue-900">
          <span>Total</span>
          <span>{INR(total)}</span>
        </div>
      </div>
    </div>
  )
}
