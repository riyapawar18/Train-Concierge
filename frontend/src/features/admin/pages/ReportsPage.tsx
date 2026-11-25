import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getReport, exportReportCsv } from '../api'

const REPORTS = [
  { id: 'disruptions', label: 'Disruptions by day' },
  { id: 'affected', label: 'Passengers affected' },
  { id: 'rebooking', label: 'Rebooking rate' },
  { id: 'notifications', label: 'Notification delivery' },
  { id: 'hotel-verdicts', label: 'Hotel verdict distribution' },
]

export function ReportsPage() {
  const [selected, setSelected] = useState('disruptions')
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)

  const report = useQuery({
    queryKey: ['admin-report', selected, from, to],
    queryFn: () => getReport(selected, from, to),
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Reports & Analytics" description="Operational metrics with CSV export." />

      <div className="flex flex-wrap gap-2">
        {REPORTS.map(r => (
          <button key={r.id} onClick={() => setSelected(r.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${selected === r.id ? 'border-brand-navy bg-brand-navy text-white' : 'border-border text-text hover:bg-surface-muted'}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 text-sm text-text">
          From <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-sm" />
        </label>
        <label className="flex items-center gap-1 text-sm text-text">
          To <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-sm" />
        </label>
        <Button asChild size="sm" variant="outline">
          <a href={exportReportCsv(selected, from, to)} download>
            <Download className="size-3.5" aria-hidden /> Export CSV
          </a>
        </Button>
      </div>

      {report.isLoading && <div className="h-48 animate-pulse rounded-xl bg-surface" />}

      {report.data && (
        <Card>
          <CardHeader><CardTitle>{REPORTS.find(r => r.id === selected)?.label}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {report.data.headers.map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {report.data.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {row.map((cell, j) => <td key={j} className="px-3 py-2 tabular-nums text-text">{cell}</td>)}
                    </tr>
                  ))}
                  {report.data.rows.length === 0 && (
                    <tr><td colSpan={report.data.headers.length} className="px-3 py-4 text-center text-muted">No data for this range</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
