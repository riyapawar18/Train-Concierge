import { useNavigate } from 'react-router-dom'
import { SearchForm } from './SearchForm'
import { buildRouteParams, routeFromValues, SEARCH_PATH, type RouteSearch } from '../searchParams'
import { todayIso } from '../date'
import type { SearchValues, StationValue } from '../types'

interface ModifySearchBarProps {
  route: RouteSearch
  fromName: string
  toName: string
}

function ModifySearchBar({ route, fromName, toName }: ModifySearchBarProps) {
  const navigate = useNavigate()

  const values: SearchValues = {
    from: route.from ? { code: route.from.code, name: fromName } : null,
    to: route.to ? { code: route.to.code, name: toName } : null,
    date: route.date || todayIso(),
    classCode: route.classCodes.length === 1 ? route.classCodes[0] : '',
    quota: route.quota,
    pwd: route.pwd,
    flexible: route.flexible,
    railPass: route.railPass,
  }

  const formKey = [
    route.from?.code ?? '',
    route.to?.code ?? '',
    route.date,
    route.classCodes.join('-'),
    route.quota,
    String(route.pwd),
    String(route.flexible),
    String(route.railPass),
  ].join('|')

  const handleSearch = (next: SearchValues) => {
    const params = buildRouteParams(routeFromValues(next))
    navigate(`${SEARCH_PATH}?${params.toString()}`)
  }

  const stationName = (station: StationValue | null, name: string) =>
    station ? { code: station.code, name } : null

  return (
    <section
      aria-label="Modify search"
      className="rounded-xl bg-brand-navy p-3 shadow-card sm:p-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-2 px-1 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Modify Search</h2>
          <p className="text-xs text-white/70">
            Change any detail and search again. Refinements are cleared.
          </p>
        </div>
        <p className="text-xs text-white/70">
          {values.from?.code ?? '—'} → {values.to?.code ?? '—'}
        </p>
      </div>
      <div className="rounded-lg bg-surface p-3 sm:p-4">
        <SearchForm
          key={formKey}
          idPrefix="modify-search"
          variant="bar"
          initialValues={{
            ...values,
            from: stationName(values.from, fromName),
            to: stationName(values.to, toName),
          }}
          onSearch={handleSearch}
          submitLabel="Search Trains"
        />
      </div>
    </section>
  )
}

export { ModifySearchBar }
