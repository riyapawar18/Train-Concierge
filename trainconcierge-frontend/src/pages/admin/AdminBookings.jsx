import { useState, useEffect } from 'react'
import { adminApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import StatusBadge from '../../components/ui/StatusBadge'
import { BookOpen, RefreshCw, AlertTriangle } from 'lucide-react'

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')

  const fetch = () => {
    setLoading(true)
    adminApi.getAllBookings()
      .then(r => setBookings(r.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load bookings.'))
      .finally(() => setLoading(false))
  }

  useEffect(fetch, [])

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter)

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" /> All Bookings
        </h1>
        <button onClick={fetch} className="btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['ALL', 'CONFIRMED', 'CANCELLED', 'REBOOKED', 'COMPLETED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors
              ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner text="Loading bookings…" />}
      {error && <ErrorMessage message={error} onRetry={fetch} />}

      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Passenger</th>
                <th className="pb-3 pr-4">Train</th>
                <th className="pb-3 pr-4">Route & Date</th>
                <th className="pb-3 pr-4">Seats</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Disruption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-mono text-gray-500">#{b.id}</td>
                  <td className="py-3 pr-4">{b.username}</td>
                  <td className="py-3 pr-4">
                    <p className="font-medium">{b.trainName}</p>
                    <p className="text-gray-400 text-xs">#{b.trainNumber}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p>{b.fromStation} → {b.toStation}</p>
                    <p className="text-gray-400 text-xs">{b.travelDate}</p>
                  </td>
                  <td className="py-3 pr-4">{b.numberOfSeats}</td>
                  <td className="py-3 pr-4">₹{b.totalAmount?.toLocaleString('en-IN')}</td>
                  <td className="py-3 pr-4"><StatusBadge status={b.status} /></td>
                  <td className="py-3">
                    {b.trainStatus !== 'ON_TIME' && (
                      <span className="flex items-center gap-1 text-xs text-yellow-700">
                        <AlertTriangle className="h-3 w-3" />
                        {b.trainStatus}
                        {b.trainDelayMinutes > 0 && ` +${b.trainDelayMinutes}m`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No bookings found</div>
          )}
        </div>
      )}
    </div>
  )
}
