import { useState, useEffect } from 'react'
import { trainApi, bookingApi } from '../services/api'
import LoadingSpinner from './ui/LoadingSpinner'
import { X, Train, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RebookModal({ booking, onClose, onSuccess }) {
  const [alternatives, setAlternatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    trainApi.getAlternatives(booking.trainId)
      .then(r => setAlternatives(r.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load alternatives.'))
      .finally(() => setLoading(false))
  }, [booking.trainId])

  const handleRebook = async () => {
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      await bookingApi.rebook({
        originalBookingId: booking.id,
        newTrainId: selected.id,
        numberOfSeats: booking.numberOfSeats
      })
      toast.success(`Rebooked on ${selected.trainName}!`)
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.error || 'Rebooking failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" /> Rebook Ticket
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4">
            <p className="font-medium">Current booking #{booking.id}</p>
            <p className="text-gray-500">{booking.trainName} · {booking.fromStation} → {booking.toStation}</p>
            <p className="text-gray-500">{booking.travelDate} · {booking.numberOfSeats} seat(s)</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
              {error}
            </div>
          )}

          {loading && <LoadingSpinner text="Loading alternatives…" />}

          {!loading && alternatives.length === 0 && (
            <p className="text-center text-gray-500 py-4">No alternative trains available for this route and date.</p>
          )}

          {!loading && alternatives.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Available alternatives:</p>
              {alternatives.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors text-sm
                    ${selected?.id === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{t.trainName} <span className="text-gray-400 text-xs">#{t.trainNumber}</span></p>
                      <p className="text-gray-500">{t.departureTime?.slice(0, 5)} → {t.arrivalTime?.slice(0, 5)}</p>
                      <p className="text-gray-500">{t.availableSeats} seats available</p>
                    </div>
                    <p className="font-bold text-blue-700">₹{t.price.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleRebook}
              className="btn-primary flex-1"
              disabled={!selected || submitting}
            >
              {submitting ? 'Rebooking…' : 'Confirm Rebook'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
