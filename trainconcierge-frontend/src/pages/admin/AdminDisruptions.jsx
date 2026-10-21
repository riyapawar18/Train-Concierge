import { useState, useEffect } from 'react'
import { trainApi, adminApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import { AlertTriangle, Zap, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDisruptions() {
  const [trains, setTrains] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ trainId: '', type: 'DELAY', delayMinutes: 30, reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    trainApi.getAll()
      .then(r => setTrains(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSimulate = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setSubmitting(true)
    try {
      const res = await adminApi.simulateDisruption({
        trainId: parseInt(form.trainId),
        type: form.type,
        delayMinutes: parseInt(form.delayMinutes),
        reason: form.reason
      })
      setResult(res.data.data)
      toast.success(`${form.type === 'DELAY' ? 'Delay' : 'Cancellation'} simulated successfully!`)
      // Refresh train list
      trainApi.getAll().then(r => setTrains(r.data.data)).catch(() => {})
    } catch (err) {
      setError(err.response?.data?.error || 'Simulation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (trainId) => {
    setResetting(trainId)
    try {
      await adminApi.resetDisruption(trainId)
      toast.success('Train reset to ON_TIME')
      trainApi.getAll().then(r => setTrains(r.data.data)).catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed')
    } finally {
      setResetting(null)
    }
  }

  const disruptedTrains = trains.filter(t => t.status !== 'ON_TIME')

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-yellow-600" /> Disruption Simulator
      </h1>

      <div className="card mb-6">
        <h2 className="font-semibold mb-1">Simulate Delay / Cancellation</h2>
        <p className="text-sm text-gray-500 mb-4">
          This will update the train status and push notifications to all affected passengers.
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}

        <form onSubmit={handleSimulate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Train</label>
            {loading ? <div className="text-sm text-gray-400">Loading trains…</div> : (
              <select className="input" value={form.trainId}
                onChange={e => setForm({ ...form, trainId: e.target.value })} required>
                <option value="">Select a train</option>
                {trains.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.trainName} ({t.trainNumber}) · {t.fromStation}→{t.toStation} · {t.travelDate}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="label">Disruption Type</label>
            <select className="input" value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="DELAY">Delay</option>
              <option value="CANCEL">Cancellation</option>
            </select>
          </div>
          {form.type === 'DELAY' && (
            <div>
              <label className="label">Delay (minutes)</label>
              <input className="input" type="number" min={1} max={600} value={form.delayMinutes}
                onChange={e => setForm({ ...form, delayMinutes: e.target.value })} />
            </div>
          )}
          <div className={form.type === 'DELAY' ? '' : 'sm:col-span-2'}>
            <label className="label">Reason (optional)</label>
            <input className="input" type="text" placeholder="e.g., Signal failure, Track maintenance"
              value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
              <Zap className="h-4 w-4" />
              {submitting ? 'Simulating…' : 'Simulate Disruption'}
            </button>
          </div>
        </form>

        {result && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <p className="font-semibold text-blue-800">Result:</p>
            <p>{result.trainName} ({result.trainNumber})</p>
            <p>Status: <strong>{result.status}</strong>
              {result.delayMinutes > 0 && ` · Delayed ${result.delayMinutes} min`}
            </p>
            <p className="text-blue-600 text-xs mt-1">Affected passengers have been notified.</p>
          </div>
        )}
      </div>

      {/* Currently disrupted trains */}
      {disruptedTrains.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Currently Disrupted Trains</h2>
          <div className="space-y-3">
            {disruptedTrains.map(t => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.trainName}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    {t.fromStation}→{t.toStation} · {t.travelDate}
                    {t.status === 'DELAYED' && ` · +${t.delayMinutes} min`}
                    {t.cancellationReason && ` · ${t.cancellationReason}`}
                  </p>
                </div>
                <button
                  onClick={() => handleReset(t.id)}
                  disabled={resetting === t.id}
                  className="btn-secondary text-xs flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  {resetting === t.id ? 'Resetting…' : 'Reset'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
