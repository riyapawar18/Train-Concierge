import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { trainApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatusBadge from '../../components/ui/StatusBadge'
import ErrorMessage from '../../components/ui/ErrorMessage'
import EmptyState from '../../components/ui/EmptyState'
import {
  Search, Train, Clock, IndianRupee, Users, MapPin,
  ChevronDown, ChevronUp, AlertCircle, Database, Wifi
} from 'lucide-react'

// ─── Constants ──────────────────────────────────────────────────────────────────
const POPULAR = [
  { from: 'Mumbai',    to: 'Delhi'     },
  { from: 'Mumbai',    to: 'Chennai'   },
  { from: 'Delhi',     to: 'Kolkata'   },
  { from: 'Pune',      to: 'Mumbai'    },
  { from: 'Bangalore', to: 'Delhi'     },
  { from: 'Mumbai',    to: 'Kolkata'   },
  { from: 'Chennai',   to: 'Delhi'     },
  { from: 'Delhi',     to: 'Bangalore' },
  { from: 'Miraj',     to: 'Pune'      },
  { from: 'Kolhapur',  to: 'Mumbai'    },
]

const SORT_OPTIONS = [
  { value: 'dep_asc',      label: 'Earliest Departure' },
  { value: 'dep_desc',     label: 'Latest Departure'   },
  { value: 'arr_asc',      label: 'Earliest Arrival'   },
  { value: 'duration_asc', label: 'Shortest Journey'   },
  { value: 'price_asc',    label: 'Price: Low → High'  },
  { value: 'price_desc',   label: 'Price: High → Low'  },
  { value: 'seats_desc',   label: 'Most Seats First'   },
]

// ─── Pure helpers ───────────────────────────────────────────────────────────────

/** "today + N" as YYYY-MM-DD in local time (no UTC drift for IST users) */
const localDateStr = (daysAhead = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

/** "HH:MM:SS" or LocalTime object → "HH:MM" */
const fmt = (t) => {
  if (!t) return '—'
  return String(t).slice(0, 5)
}

/** Duration in minutes → "Xh Ym" */
const fmtDuration = (mins) => {
  if (!mins || mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** ISO date string → "20 Oct 2026" */
const fmtDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** "HH:MM:SS" → total minutes since midnight */
const toMins = (t) => {
  const [h, m] = String(t ?? '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Fallback duration from dep/arr strings when durationMinutes is null */
const fallbackDuration = (dep, arr) => {
  try {
    let diff = toMins(arr) - toMins(dep)
    if (diff < 0) diff += 24 * 60
    return fmtDuration(diff)
  } catch { return null }
}

/** Sort + filter the results array */
const applyDisplay = (results, sortBy, onlyBookable, typeFilter) => {
  let out = [...results]
  if (onlyBookable) out = out.filter(r => r.bookable)
  if (typeFilter)   out = out.filter(r => r.trainType === typeFilter)
  switch (sortBy) {
    case 'dep_asc':      return out.sort((a, b) => toMins(a.departureTime) - toMins(b.departureTime))
    case 'dep_desc':     return out.sort((a, b) => toMins(b.departureTime) - toMins(a.departureTime))
    case 'arr_asc':      return out.sort((a, b) => toMins(a.arrivalTime) - toMins(b.arrivalTime))
    case 'duration_asc': return out.sort((a, b) => (a.durationMinutes ?? 9999) - (b.durationMinutes ?? 9999))
    case 'price_asc':    return out.sort((a, b) => a.price - b.price)
    case 'price_desc':   return out.sort((a, b) => b.price - a.price)
    case 'seats_desc':   return out.sort((a, b) => b.availableSeats - a.availableSeats)
    default:             return out
  }
}

/** Map HTTP status codes to user-friendly provider error objects */
const providerError = (status, msg) => {
  if (status === 401) return { kind: 'auth',     text: 'Train data provider authentication failed. Contact your administrator.' }
  if (status === 429) return { kind: 'ratelimit', text: 'Train data provider rate limit reached. Please try again later.' }
  if (status === 503) return { kind: 'timeout',   text: 'Train data provider is unreachable right now. Showing local results if available.' }
  if (status === 400) return { kind: 'input',     text: msg || 'Invalid search parameters.' }
  return               { kind: 'error',    text: msg || 'Search failed. Please try again.' }
}

// ─── Main page component ────────────────────────────────────────────────────────
export default function SearchPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    from: '', to: '', date: localDateStr(1), seats: 1,
  })
  const [results,      setResults]      = useState(null)   // null = not searched yet
  const [loading,      setLoading]      = useState(false)
  const [apiError,     setApiError]     = useState(null)   // { kind, text }
  const [formError,    setFormError]    = useState('')
  const [sortBy,       setSortBy]       = useState('dep_asc')
  const [onlyBookable, setOnlyBookable] = useState(false)
  const [typeFilter,   setTypeFilter]   = useState('')
  const [showFilters,  setShowFilters]  = useState(false)

  // All unique trainType values from current results (for filter dropdown)
  const trainTypes = results
    ? [...new Set(results.map(r => r.trainType).filter(Boolean))]
    : []

  // ── Form validation ──────────────────────────────────────────────────────
  const validate = (f) => {
    if (!f.from.trim())  return 'Please enter a departure city or station.'
    if (!f.to.trim())    return 'Please enter a destination city or station.'
    if (f.from.trim().toLowerCase() === f.to.trim().toLowerCase())
                         return 'Departure and destination cannot be the same.'
    if (!f.date)         return 'Please select a travel date.'
    if (f.seats < 1 || f.seats > 10) return 'Seats must be between 1 and 10.'
    return ''
  }

  // ── Core search call ─────────────────────────────────────────────────────
  const doSearch = useCallback(async (params) => {
    setLoading(true)
    setApiError(null)
    setResults(null)
    setTypeFilter('')
    setOnlyBookable(false)
    try {
      const res = await trainApi.search(params)
      setResults(res.data.data || [])
    } catch (err) {
      setApiError(providerError(err.response?.status, err.response?.data?.error))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = (e) => {
    e?.preventDefault()
    const err = validate(form)
    if (err) { setFormError(err); return }
    setFormError('')
    doSearch({ from: form.from.trim(), to: form.to.trim(), date: form.date, seats: form.seats })
  }

  const quickSearch = (from, to) => {
    const updated = { ...form, from, to }
    setForm(updated)
    const err = validate(updated)
    if (err) return
    doSearch({ from, to, date: updated.date, seats: updated.seats })
  }

  // ── Derived display list ─────────────────────────────────────────────────
  const displayed = results
    ? applyDisplay(results, sortBy, onlyBookable, typeFilter)
    : []

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Search className="h-6 w-6 text-blue-600" />
        Search Trains
      </h1>

      {/* ── Search form ── */}
      <div className="card mb-6">
        <form onSubmit={handleSearch}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label" htmlFor="s-from">From</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input id="s-from" className="input pl-9" type="text"
                placeholder="City or station"
                value={form.from}
                onChange={e => setForm({ ...form, from: e.target.value })}
                required aria-label="Departure city or station" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="s-to">To</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input id="s-to" className="input pl-9" type="text"
                placeholder="City or station"
                value={form.to}
                onChange={e => setForm({ ...form, to: e.target.value })}
                required aria-label="Destination city or station" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="s-date">Date</label>
            <input id="s-date" className="input" type="date"
              value={form.date}
              min={localDateStr(0)}
              onChange={e => setForm({ ...form, date: e.target.value })}
              required aria-label="Travel date" />
          </div>
          <div>
            <label className="label" htmlFor="s-seats">Seats</label>
            <input id="s-seats" className="input" type="number"
              min={1} max={10} value={form.seats}
              onChange={e => setForm({ ...form, seats: parseInt(e.target.value) || 1 })}
              aria-label="Number of seats" />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            {/* Inline form validation error */}
            {formError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded p-2.5 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={loading}
                    aria-label="Search trains">
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Searching…
                  </span>
                : 'Search Trains'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Popular routes (shown only before first search) ── */}
      {!results && !loading && !apiError && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Popular routes:</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map(({ from, to }) => (
              <button key={`${from}-${to}`}
                onClick={() => quickSearch(from, to)}
                className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full
                           hover:bg-blue-100 border border-blue-200 transition-colors"
                aria-label={`Search ${from} to ${to}`}>
                {from} → {to}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && <LoadingSpinner text="Searching trains…" />}

      {/* ── Provider / network error ── */}
      {apiError && (
        <ErrorMessage
          message={`${
            { auth: '🔑', ratelimit: '⏱', timeout: '📡', error: '⚠', input: '⚠' }[apiError.kind] ?? '⚠'
          } ${apiError.text}`}
          onRetry={handleSearch}
        />
      )}

      {/* ── Results ── */}
      {results !== null && !loading && (
        <>
          {/* Count row + sort/filter controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{results.length}</span>{' '}
              train{results.length !== 1 ? 's' : ''} found
              {form.from && form.to && (
                <span className="text-gray-400 ml-1">
                  · {form.from} → {form.to} · {fmtDate(form.date)}
                </span>
              )}
              {results.length > 0 && displayed.length < results.length && (
                <span className="text-blue-600 ml-1">
                  ({displayed.length} after filters)
                </span>
              )}
            </p>

            <div className="flex items-center gap-2">
              <select className="text-xs border border-gray-300 rounded px-2 py-1
                                 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={sortBy} onChange={e => setSortBy(e.target.value)}
                aria-label="Sort results">
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button className="btn-secondary text-xs flex items-center gap-1"
                onClick={() => setShowFilters(f => !f)}
                aria-expanded={showFilters}>
                Filters {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="card mb-4 bg-gray-50 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="rounded"
                    checked={onlyBookable}
                    onChange={e => setOnlyBookable(e.target.checked)} />
                  Bookable in this app only
                </label>
                {trainTypes.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600" htmlFor="type-filter">Type:</label>
                    <select id="type-filter"
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value)}>
                      <option value="">All types</option>
                      {trainTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                <button className="text-xs text-red-500 hover:text-red-700"
                  onClick={() => { setOnlyBookable(false); setTypeFilter('') }}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {displayed.length === 0 && (
            <EmptyState
              icon={Train}
              title={results.length === 0 ? 'No trains available' : 'No trains match your filters'}
              description={
                results.length === 0
                  ? `No trains found for ${form.from} → ${form.to} on ${fmtDate(form.date)}. ` +
                    `Try checking the spelling, using a nearby city, changing the date, or fewer seats. ` +
                    `Results come from the TrainConcierge database. ` +
                    `Configure a RailRadar API key for broader Indian Railways timetable coverage.`
                  : 'Remove filters to see all results.'
              }
              action={
                results.length > 0
                  ? <button className="btn-secondary text-sm"
                      onClick={() => { setOnlyBookable(false); setTypeFilter('') }}>
                      Clear Filters
                    </button>
                  : <button className="btn-secondary text-sm" onClick={handleSearch}>
                      Try Again
                    </button>
              }
            />
          )}

          {/* Train cards */}
          <div className="space-y-4">
            {displayed.map((train, idx) => (
              <TrainCard
                key={`${train.trainNumber}-${idx}`}
                train={train}
                seats={form.seats}
                onBook={() => navigate(`/book/${train.id}?seats=${form.seats}`)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── TrainCard ──────────────────────────────────────────────────────────────────
function TrainCard({ train, seats, onBook }) {
  const duration = train.durationMinutes
    ? fmtDuration(train.durationMinutes)
    : fallbackDuration(train.departureTime, train.arrivalTime)

  const hasPrice     = train.price > 0
  const canBook      = train.bookable && train.id != null && train.status !== 'CANCELLED'
  const notEnough    = train.availableSeats > 0 && train.availableSeats < seats
  const totalStr     = hasPrice && seats > 1
    ? (train.price * seats).toLocaleString('en-IN')
    : null

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

        {/* Left: train info */}
        <div className="flex-1 min-w-0">
          {/* Name + badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Train className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold text-gray-900 truncate">{train.trainName}</span>
            <span className="text-xs text-gray-400">#{train.trainNumber}</span>
            {train.trainType && (
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                {train.trainType}
              </span>
            )}
            {train.status && <StatusBadge status={train.status} />}
            {train.status === 'DELAYED' && train.delayMinutes > 0 && (
              <span className="text-xs text-yellow-700 font-medium">
                +{train.delayMinutes} min
              </span>
            )}
            <SourceBadge source={train.dataSource} />
          </div>

          {/* Departure → arrival */}
          <div className="flex items-center gap-2 text-sm text-gray-700 mb-1 flex-wrap">
            <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="font-semibold">{fmt(train.departureTime)}</span>
            <span className="text-gray-400">→</span>
            <span className="font-semibold">{fmt(train.arrivalTime)}</span>
            {duration && (
              <span className="text-gray-400 text-xs">({duration})</span>
            )}
          </div>

          {/* From → to stations */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1 flex-wrap">
            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span>{train.fromStation}</span>
            <span className="text-gray-300">→</span>
            <span>{train.toStation}</span>
            {train.travelDate && (
              <span className="text-gray-400 text-xs hidden sm:inline">
                · {fmtDate(train.travelDate)}
              </span>
            )}
          </div>

          {/* Seat availability */}
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
            <Users className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            {train.availableSeats > 0
              ? <span>{train.availableSeats} seats available</span>
              : <span className="text-amber-600 text-xs">Seat count unavailable (timetable data)</span>
            }
          </div>

          {/* Timetable-only notice */}
          {!train.bookable && (
            <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200
                          rounded px-2 py-1 inline-block">
              ℹ Timetable data — cannot be booked in this app
            </p>
          )}
        </div>

        {/* Right: price + action */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {hasPrice ? (
            <div className="text-right">
              <div className="flex items-center gap-0.5 text-lg font-bold text-gray-900">
                <IndianRupee className="h-4 w-4" />
                {train.price.toLocaleString('en-IN')}
                <span className="text-xs font-normal text-gray-400 ml-0.5">/seat</span>
              </div>
              {totalStr && (
                <div className="text-xs text-gray-500">Total: ₹{totalStr}</div>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400 mt-1">Fare not listed</span>
          )}

          {canBook ? (
            <button
              onClick={onBook}
              disabled={notEnough || train.status === 'CANCELLED'}
              className="btn-primary text-sm"
              aria-label={`Book ${train.trainName}`}>
              {train.status === 'CANCELLED' ? 'Unavailable'
                : notEnough ? 'Not enough seats'
                : 'Book Now'}
            </button>
          ) : (
            <button disabled
              className="btn-secondary text-sm opacity-60 cursor-not-allowed"
              title="This train comes from external timetable data and cannot be booked here">
              Timetable only
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Small source badge ─────────────────────────────────────────────────────────
function SourceBadge({ source }) {
  if (!source) return null
  if (source === 'DATABASE') return (
    <span className="flex items-center gap-0.5 text-xs text-green-700 bg-green-50
                     border border-green-200 px-1.5 py-0.5 rounded-full"
          title="From TrainConcierge database — bookable">
      <Database className="h-2.5 w-2.5" /> DB
    </span>
  )
  if (source === 'RAILRADAR') return (
    <span className="flex items-center gap-0.5 text-xs text-blue-700 bg-blue-50
                     border border-blue-200 px-1.5 py-0.5 rounded-full"
          title="Timetable data from RailRadar — not bookable here">
      <Wifi className="h-2.5 w-2.5" /> RailRadar
    </span>
  )
  return null
}
