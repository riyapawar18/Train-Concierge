import { useState, useEffect } from 'react'
import { adminApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import { LayoutDashboard, Train, BookOpen, Users, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.getStats()
      .then(r => setStats(r.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load stats.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6 text-blue-600" /> Admin Dashboard
      </h1>

      {loading && <LoadingSpinner text="Loading stats…" />}
      {error && <ErrorMessage message={error} />}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Train} label="Total Trains" value={stats.totalTrains} color="blue" />
          <StatCard icon={BookOpen} label="Total Bookings" value={stats.totalBookings} color="green" />
          <StatCard icon={TrendingUp} label="Confirmed Bookings" value={stats.confirmedBookings} color="purple" />
          <StatCard icon={Users} label="Registered Users" value={stats.totalUsers} color="orange" />
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a href="/admin/trains" className="block p-4 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <Train className="h-5 w-5 text-blue-600 mb-2" />
            <p className="font-medium text-sm">Manage Trains</p>
            <p className="text-xs text-gray-500">Add, edit, or delete trains</p>
          </a>
          <a href="/admin/disruptions" className="block p-4 border rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-colors">
            <span className="text-xl mb-2 block">⚠️</span>
            <p className="font-medium text-sm">Simulate Disruption</p>
            <p className="text-xs text-gray-500">Delay or cancel trains</p>
          </a>
          <a href="/admin/bookings" className="block p-4 border rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors">
            <BookOpen className="h-5 w-5 text-green-600 mb-2" />
            <p className="font-medium text-sm">All Bookings</p>
            <p className="text-xs text-gray-500">View passenger bookings</p>
          </a>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700'
  }
  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <Icon className="h-6 w-6 mb-2 opacity-80" />
      <p className="text-3xl font-bold">{value ?? '—'}</p>
      <p className="text-sm font-medium opacity-70 mt-1">{label}</p>
    </div>
  )
}
