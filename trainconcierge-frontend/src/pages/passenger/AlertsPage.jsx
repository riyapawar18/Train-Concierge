import { useState, useEffect } from 'react'
import { alertApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import { AlertCircle, Plus, X, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const [form, setForm] = useState({ fromStation: '', toStation: '', travelDate: tomorrow, seatsRequired: 1 })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetch = () => {
    setLoading(true)
    alertApi.getAll()
      .then(r => setAlerts(r.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load.'))
      .finally(() => setLoading(false))
  }

  useEffect(fetch, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      const res = await alertApi.create({
        ...form,
        seatsRequired: parseInt(form.seatsRequired)
      })
      toast.success(res.data.data.status === 'TRIGGERED'
        ? 'Alert created and immediately triggered — seats are available!'
        : 'Seat alert created!')
      setShowForm(false)
      setForm({ fromStation: '', toStation: '', travelDate: tomorrow, seatsRequired: 1 })
      fetch()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create alert.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id) => {
    try {
      await alertApi.cancel(id)
      toast.success('Alert cancelled')
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel')
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-blue-600" /> Seat Alerts
        </h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'New Alert'}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Get notified when seats become available on your preferred route.
        Alerts are triggered immediately if seats are already available.
      </p>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">Create Seat Alert</h2>
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">{formError}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">From Station</label>
              <input className="input" type="text" required placeholder="e.g., Mumbai"
                value={form.fromStation} onChange={e => setForm({ ...form, fromStation: e.target.value })} />
            </div>
            <div>
              <label className="label">To Station</label>
              <input className="input" type="text" required placeholder="e.g., Delhi"
                value={form.toStation} onChange={e => setForm({ ...form, toStation: e.target.value })} />
            </div>
            <div>
              <label className="label">Travel Date</label>
              <input className="input" type="date" required value={form.travelDate}
                onChange={e => setForm({ ...form, travelDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Seats Required</label>
              <input className="input" type="number" min={1} max={10} value={form.seatsRequired}
                onChange={e => setForm({ ...form, seatsRequired: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Alert'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <LoadingSpinner text="Loading alerts…" />}
      {error && <ErrorMessage message={error} onRetry={fetch} />}

      {!loading && !error && alerts.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No seat alerts"
          description="Create an alert to be notified when seats open up on your route."
        />
      )}

      <div className="space-y-3">
        {alerts.map(a => (
          <div key={a.id} className={`card ${a.status === 'TRIGGERED' ? 'border-green-400 bg-green-50' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{a.fromStation} → {a.toStation}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-sm text-gray-600">Date: {a.travelDate} · Seats: {a.seatsRequired}</p>
                <p className="text-xs text-gray-400 mt-1">Created: {new Date(a.createdAt).toLocaleString()}</p>
                {a.triggeredAt && (
                  <p className="text-xs text-green-700 mt-0.5">✓ Triggered: {new Date(a.triggeredAt).toLocaleString()}</p>
                )}
              </div>
              {a.status === 'ACTIVE' && (
                <button onClick={() => handleCancel(a.id)} className="text-red-500 hover:text-red-700 p-1">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
