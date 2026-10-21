import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { trainApi, bookingApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import StatusBadge from '../../components/ui/StatusBadge'
import { Train, Clock, IndianRupee, Users, ArrowRight, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BookPage() {
  const { trainId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [train, setTrain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [seats, setSeats] = useState(parseInt(searchParams.get('seats')) || 1)

  useEffect(() => {
    trainApi.getById(trainId)
      .then(r => setTrain(r.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load train details.'))
      .finally(() => setLoading(false))
  }, [trainId])

  const handleBook = async () => {
    setBooking(true)
    setError('')
    try {
      const res = await bookingApi.create({ trainId: parseInt(trainId), numberOfSeats: seats })
      setSuccess(res.data.data)
      toast.success('Booking confirmed!')
    } catch (err) {
      // Never show fake success — show real error
      setError(err.response?.data?.error || 'Booking failed. Please try again.')
    } finally {
      setBooking(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading train details…" />

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center">
        <div className="card">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-500 mb-6">Booking #{success.id}</p>
          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6 space-y-2 text-sm">
            <Row label="Train" value={`${success.trainName} (${success.trainNumber})`} />
            <Row label="Route" value={`${success.fromStation} → ${success.toStation}`} />
            <Row label="Date" value={success.travelDate} />
            <Row label="Departure" value={success.departureTime} />
            <Row label="Seats" value={success.numberOfSeats} />
            <Row label="Total Paid" value={`₹${success.totalAmount.toLocaleString('en-IN')}`} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/bookings')} className="btn-primary flex-1">
              View My Bookings
            </button>
            <button onClick={() => navigate('/search')} className="btn-secondary flex-1">
              Search More
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Confirm Booking</h1>

      {error && <ErrorMessage message={error} />}

      {train && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Train className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-lg">{train.trainName}</h2>
            <span className="text-sm text-gray-500">#{train.trainNumber}</span>
            <StatusBadge status={train.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-gray-400">From</p>
              <p className="font-semibold">{train.fromStation}</p>
              <p className="text-blue-600 font-medium">{train.departureTime?.slice(0, 5)}</p>
            </div>
            <div>
              <p className="text-gray-400">To</p>
              <p className="font-semibold">{train.toStation}</p>
              <p className="text-blue-600 font-medium">{train.arrivalTime?.slice(0, 5)}</p>
            </div>
          </div>

          {train.status === 'DELAYED' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-4">
              ⚠ This train is currently delayed by {train.delayMinutes} minutes.
            </div>
          )}
          {train.status === 'CANCELLED' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 mb-4">
              ✗ This train has been cancelled. Booking is not possible.
            </div>
          )}

          <div>
            <label className="label">Number of Seats</label>
            <div className="flex items-center gap-3">
              <button className="btn-secondary px-3 py-1"
                onClick={() => setSeats(Math.max(1, seats - 1))}>−</button>
              <span className="text-lg font-semibold w-8 text-center">{seats}</span>
              <button className="btn-secondary px-3 py-1"
                onClick={() => setSeats(Math.min(train.availableSeats, seats + 1))}>+</button>
              <span className="text-sm text-gray-500">of {train.availableSeats} available</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-blue-700">
                ₹{(train.price * seats).toLocaleString('en-IN')}
              </p>
            </div>
            <button
              onClick={handleBook}
              className="btn-primary px-6"
              disabled={booking || train.status === 'CANCELLED' || train.availableSeats < seats}
            >
              {booking ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="btn-secondary w-full">
        ← Back to Search
      </button>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
