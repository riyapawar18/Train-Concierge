import { useState, useEffect } from 'react'
import { trainApi, adminApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import StatusBadge from '../../components/ui/StatusBadge'
import { Train, Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  trainNumber: '', trainName: '', fromStation: '', toStation: '',
  travelDate: '', departureTime: '', arrivalTime: '',
  totalSeats: 200, availableSeats: 200, price: 1000
}

export default function AdminTrains() {
  const [trains, setTrains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetch = () => {
    setLoading(true)
    trainApi.getAll()
      .then(r => setTrains(r.data.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load trains.'))
      .finally(() => setLoading(false))
  }

  useEffect(fetch, [])

  const startEdit = (t) => {
    setEditId(t.id)
    setForm({
      trainNumber: t.trainNumber, trainName: t.trainName,
      fromStation: t.fromStation, toStation: t.toStation,
      travelDate: t.travelDate, departureTime: t.departureTime?.slice(0, 5),
      arrivalTime: t.arrivalTime?.slice(0, 5),
      totalSeats: t.totalSeats, availableSeats: t.availableSeats, price: t.price
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      if (editId) {
        await adminApi.updateTrain(editId, form)
        toast.success('Train updated')
      } else {
        await adminApi.addTrain(form)
        toast.success('Train added')
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      fetch()
    } catch (err) {
      setFormError(err.response?.data?.error || 'Operation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this train? This cannot be undone.')) return
    try {
      await adminApi.deleteTrain(id)
      toast.success('Train deleted')
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Train className="h-6 w-6 text-blue-600" /> Manage Trains
        </h1>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM) }}
          className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> {showForm && !editId ? 'Cancel' : 'Add Train'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-4">{editId ? 'Edit Train' : 'Add New Train'}</h2>
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">{formError}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'trainNumber', label: 'Train Number', type: 'text' },
              { key: 'trainName', label: 'Train Name', type: 'text' },
              { key: 'fromStation', label: 'From Station', type: 'text' },
              { key: 'toStation', label: 'To Station', type: 'text' },
              { key: 'travelDate', label: 'Travel Date', type: 'date' },
              { key: 'departureTime', label: 'Departure Time', type: 'time' },
              { key: 'arrivalTime', label: 'Arrival Time', type: 'time' },
              { key: 'totalSeats', label: 'Total Seats', type: 'number' },
              { key: 'availableSeats', label: 'Available Seats', type: 'number' },
              { key: 'price', label: 'Price (₹)', type: 'number' }
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input className="input" type={type} required value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : editId ? 'Update Train' : 'Add Train'}
              </button>
              <button type="button" className="btn-secondary"
                onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM) }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <LoadingSpinner text="Loading trains…" />}
      {error && <ErrorMessage message={error} onRetry={fetch} />}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase">
              <th className="pb-3 pr-4">Train</th>
              <th className="pb-3 pr-4">Route</th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Time</th>
              <th className="pb-3 pr-4">Seats</th>
              <th className="pb-3 pr-4">Price</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {trains.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="py-3 pr-4">
                  <p className="font-medium">{t.trainName}</p>
                  <p className="text-gray-400">#{t.trainNumber}</p>
                </td>
                <td className="py-3 pr-4 text-gray-600">{t.fromStation} → {t.toStation}</td>
                <td className="py-3 pr-4 text-gray-600">{t.travelDate}</td>
                <td className="py-3 pr-4 text-gray-600">
                  {t.departureTime?.slice(0, 5)} → {t.arrivalTime?.slice(0, 5)}
                </td>
                <td className="py-3 pr-4">
                  <span className={t.availableSeats < 20 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                    {t.availableSeats}/{t.totalSeats}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-700">₹{t.price.toLocaleString('en-IN')}</td>
                <td className="py-3 pr-4"><StatusBadge status={t.status} /></td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(t)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
