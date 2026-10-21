import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { bookingApi, trainApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import { BookOpen, Train, AlertTriangle, RefreshCw, X, Hotel, Car } from 'lucide-react'
import toast from 'react-hot-toast'
import RebookModal from '../../components/RebookModal'

export default function BookingsPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(null)
  const [rebookTarget, setRebookTarget] = useState(null)

  const fetch = () => {
    setLoading(true)
    setError('')
    bookingApi.getAll()
      .then(r => setBookings(r.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load bookings.'))
      .finally(() => setLoading(false))
  }

  useEffect(fetch, [])

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return
    setCancelling(id)
    try {
      await bookingApi.cancel(id)
      toast.success('Booking cancelled')
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cancel failed')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          My Bookings
        </h1>
        <button onClick={fetch} className="btn-secondary text-sm flex items-center gap-1.5">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {loading && <LoadingSpinner text="Loading bookings…" />}
      {error && <ErrorMessage message={error} onRetry={fetch} />}

      {!loading && !error && bookings.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No bookings yet"
          description="Search for trains and make your first booking."
          action={<button onClick={() => navigate('/search')} className="btn-primary">Search Trains</button>}
        />
      )}

      {!loading && bookings.length > 0 && (
        <div className="space-y-4">
          {bookings.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={() => handleCancel(b.id)}
              onRebook={() => setRebookTarget(b)}
              cancelling={cancelling === b.id}
              onHotel={() => navigate(`/hotels?destination=${encodeURIComponent(b.toStation)}&bookingId=${b.id}&travelDate=${encodeURIComponent(b.travelDate)}`)}
              onCab={() => navigate(`/cabs?destination=${encodeURIComponent(b.toStation)}&bookingId=${b.id}&travelDate=${encodeURIComponent(b.travelDate)}&arrivalTime=${encodeURIComponent(b.arrivalTime || '')}`)}
            />
          ))}
        </div>
      )}

      {rebookTarget && (
        <RebookModal
          booking={rebookTarget}
          onClose={() => setRebookTarget(null)}
          onSuccess={() => { setRebookTarget(null); fetch() }}
        />
      )}
    </div>
  )
}

function BookingCard({ booking, onCancel, onRebook, cancelling, onHotel, onCab }) {
  const isActive = booking.status === 'CONFIRMED'
  const isDisrupted = booking.trainStatus === 'DELAYED' || booking.trainStatus === 'CANCELLED'

  return (
    <div className={`card ${isDisrupted && isActive ? 'border-yellow-400 bg-yellow-50' : ''}`}>
      {isDisrupted && isActive && (
        <div className="flex items-center gap-2 mb-3 text-yellow-800 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          {booking.trainStatus === 'CANCELLED' ? 'This train has been CANCELLED. Please rebook.' :
            `Train delayed by ${booking.trainDelayMinutes} min. Consider rebooking.`}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Train className="h-4 w-4 text-blue-600" />
            <span className="font-semibold">{booking.trainName}</span>
            <span className="text-xs text-gray-400">#{booking.trainNumber}</span>
            <StatusBadge status={booking.status} />
          </div>
          <div className="text-sm text-gray-600 space-y-0.5">
            <p>{booking.fromStation} → {booking.toStation} · {booking.travelDate}</p>
            <p>Departure: {booking.departureTime?.slice(0, 5)} · {booking.numberOfSeats} seat(s)</p>
            <p className="font-medium text-gray-800">₹{booking.totalAmount.toLocaleString('en-IN')}</p>
          </div>
          {booking.originalBookingId && (
            <p className="text-xs text-blue-600 mt-1">↳ Rebooked from #{booking.originalBookingId}</p>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-2">
          {isActive && (
            <>
              <button onClick={onRebook} className="btn-secondary text-xs flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Rebook
              </button>
              <button onClick={onHotel} className="btn-secondary text-xs flex items-center gap-1">
                <Hotel className="h-3 w-3" /> Hotel
              </button>
              <button onClick={onCab} className="btn-secondary text-xs flex items-center gap-1">
                <Car className="h-3 w-3" /> Cab
              </button>
              <button
                onClick={onCancel}
                disabled={cancelling}
                className="btn-danger text-xs flex items-center gap-1"
              >
                <X className="h-3 w-3" /> {cancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
