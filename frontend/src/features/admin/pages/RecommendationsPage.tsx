import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { getAdminDisruptions } from '@/features/disruptions/api'
import { api } from '@/lib/apiClient'

interface RecEntry {
  id: number
  impactId: number
  pnr: string
  kind: string
  refTrainNumber: string | null
  classCode: string | null
  score: number
  rank: number
  recommended: boolean
  reasons: string[]
  warnings: string[]
}

function getRecsForDisruption(disruptionId: number): Promise<RecEntry[]> {
  return api.get<RecEntry[]>(`/admin/recommendations?disruptionId=${disruptionId}`)
}

function regenerate(impactId: number): Promise<void> {
  return api.post<void>(`/admin/impacts/${impactId}/regenerate`)
}

export function RecommendationsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [selectedDisruption, setSelectedDisruption] = useState<number | null>(null)

  const disruptions = useQuery({
    queryKey: ['admin-disruptions-active'],
    queryFn: () => getAdminDisruptions({ status: 'ACTIVE' }),
  })

  const recs = useQuery({
    queryKey: ['admin-recs', selectedDisruption],
    queryFn: () => getRecsForDisruption(selectedDisruption!),
    enabled: selectedDisruption !== null,
  })

  const regen = useMutation({
    mutationFn: (impactId: number) => regenerate(impactId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-recs'] })
      toast({ title: 'Regenerated', tone: 'success' })
    },
  })

  const cols: DataTableColumn<RecEntry>[] = [
    { id: 'rank', header: 'Rank', cell: r => <span className="tabular-nums">{r.rank}</span> },
    { id: 'pnr', header: 'PNR', cell: r => <span className="font-mono">{r.pnr}</span> },
    { id: 'kind', header: 'Kind', cell: r => <Badge tone="neutral">{r.kind}</Badge> },
    { id: 'ref', header: 'Ref', cell: r => <span className="text-sm">{r.refTrainNumber ?? '—'}{r.classCode ? ` · ${r.classCode}` : ''}</span> },
    { id: 'score', header: 'Score', cell: r => <span className="tabular-nums font-semibold">{r.score}</span> },
    { id: 'rec', header: '', cell: r => r.recommended ? <Badge tone="success">Top pick</Badge> : null },
    {
      id: 'actions', header: '', align: 'right',
      cell: r => (
        <Button size="sm" variant="outline" onClick={() => regen.mutate(r.impactId)} disabled={regen.isPending}>
          Re-run
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Recovery Recommendations" description="Ranked alternatives per disruption impact." />

      <select
        value={selectedDisruption ?? ''}
        onChange={e => setSelectedDisruption(e.target.value ? Number(e.target.value) : null)}
        className="h-10 w-full max-w-xs rounded-lg border border-border bg-surface px-3 text-sm"
      >
        <option value="">Select a disruption…</option>
        {disruptions.data?.map(d => (
          <option key={d.id} value={d.id}>{d.trainName} – {d.travelDate}</option>
        ))}
      </select>

      {recs.isLoading && <div className="h-48 animate-pulse rounded-xl bg-surface" />}
      {recs.data && (
        <DataTable caption="Recommendations" columns={cols} rows={recs.data} getRowKey={r => String(r.id)} emptyDescription="No recommendations for this disruption." />
      )}
    </div>
  )
}
