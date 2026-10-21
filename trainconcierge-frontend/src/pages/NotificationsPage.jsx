import { useState, useEffect } from 'react'
import { notificationApi } from '../services/api'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import EmptyState from '../components/ui/EmptyState'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_ICONS = {
  BOOKING_CONFIRMED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  BOOKING_CANCELLED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  TRAIN_DELAYED: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  TRAIN_CANCELLED: { icon: XCircle, color: 'text-red-700', bg: 'bg-red-100' },
  SEAT_AVAILABLE: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
  ALTERNATIVE_SUGGESTED: { icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-100' },
  REBOOKING_CONFIRMED: { icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-100' },
  HOTEL_CONFIRMED: { icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  CAB_CONFIRMED: { icon: CheckCircle, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  GENERAL: { icon: Info, color: 'text-gray-600', bg: 'bg-gray-100' }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = () => {
    setLoading(true)
    notificationApi.getAll()
      .then(r => setNotifications(r.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load notifications.'))
      .finally(() => setLoading(false))
  }

  useEffect(fetch, [])

  const markAll = async () => {
    try {
      await notificationApi.markAllRead()
      toast.success('All marked as read')
      fetch()
    } catch { toast.error('Failed') }
  }

  const markOne = async (id) => {
    try {
      await notificationApi.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {}
  }

  const unread = notifications.filter(n => !n.isRead).length

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" /> Notifications
          </h1>
          {unread > 0 && <p className="text-sm text-gray-500 mt-1">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="btn-secondary flex items-center gap-1.5 text-sm">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {loading && <LoadingSpinner text="Loading notifications…" />}
      {error && <ErrorMessage message={error} onRetry={fetch} />}

      {!loading && !error && notifications.length === 0 && (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      )}

      <div className="space-y-2">
        {notifications.map(n => {
          const { icon: Icon, color, bg } = TYPE_ICONS[n.type] || TYPE_ICONS.GENERAL
          return (
            <div
              key={n.id}
              onClick={() => !n.isRead && markOne(n.id)}
              className={`card cursor-pointer transition-colors hover:shadow-md
                ${n.isRead ? 'opacity-70' : 'border-blue-200 bg-blue-50/30'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`${bg} ${color} p-2 rounded-full flex-shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-semibold ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
