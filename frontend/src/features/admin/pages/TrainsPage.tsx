import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/apiClient'

interface TrainItem {
  number: string
  name: string
  type: string
  sourceCode: string
  destinationCode: string
  runsOn: string
}

function getTrains(): Promise<TrainItem[]> {
  return api.get<TrainItem[]>('/catalog/trains')
}

export function TrainsPage() {
  const trains = useQuery({ queryKey: ['admin-trains'], queryFn: getTrains })

  const cols: DataTableColumn<TrainItem>[] = [
    { id: 'number', header: 'Number', cell: r => <span className="font-mono text-sm font-medium">{r.number}</span> },
    { id: 'name', header: 'Name', cell: r => <span className="text-sm text-text">{r.name}</span> },
    { id: 'type', header: 'Type', cell: r => <Badge tone="neutral">{r.type}</Badge> },
    { id: 'route', header: 'Route', cell: r => <span className="text-sm text-muted">{r.sourceCode} → {r.destinationCode}</span> },
    { id: 'runs', header: 'Runs on', cell: r => <span className="text-xs text-muted">{r.runsOn}</span> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Train catalogue" description="All services tracked by TrainConcierge." />
      {trains.isLoading
        ? <div className="h-48 animate-pulse rounded-xl bg-surface" />
        : <DataTable caption="Trains" columns={cols} rows={trains.data ?? []} getRowKey={r => r.number} emptyDescription="No trains in catalogue." />
      }
    </div>
  )
}
