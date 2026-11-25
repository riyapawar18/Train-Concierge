import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { normalizeApiError } from '@/lib/apiClient'
import { getAdminUsers, changeUserRole, type UserRoleEntry } from '../api'

export function RolesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [page, setPage] = useState(0)
  const [confirmTarget, setConfirmTarget] = useState<{ entry: UserRoleEntry; newRole: string } | null>(null)

  const list = useQuery({ queryKey: ['admin-users', page], queryFn: () => getAdminUsers(page, 20) })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => changeUserRole(id, role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] })
      toast({ title: 'Role updated', tone: 'success' })
    },
    onError: (e) => toast({ title: normalizeApiError(e).message, tone: 'danger' }),
  })

  const cols: DataTableColumn<UserRoleEntry>[] = [
    {
      id: 'user', header: 'User',
      cell: r => (
        <div>
          <p className="font-medium text-text">{r.fullName}</p>
          <p className="text-xs text-muted">{r.email}</p>
        </div>
      ),
    },
    { id: 'role', header: 'Role', cell: r => <Badge tone={r.role === 'ADMIN' ? 'warning' : 'neutral'}>{r.role}</Badge> },
    { id: 'status', header: 'Status', cell: r => <Badge tone={r.enabled ? 'success' : 'neutral'}>{r.enabled ? 'Active' : 'Disabled'}</Badge> },
    {
      id: 'actions', header: '', align: 'right',
      cell: r => (
        r.role === 'ADMIN'
          ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirmTarget({ entry: r, newRole: 'PASSENGER' })}>Demote</Button>
          : <Button size="sm" variant="outline" onClick={() => setConfirmTarget({ entry: r, newRole: 'ADMIN' })}>Promote to Admin</Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="User Roles & Access" description="Promote or demote users. Role changes are audited." />

      {list.isLoading
        ? <div className="h-48 animate-pulse rounded-xl bg-surface" />
        : <DataTable caption="Users" columns={cols} rows={list.data?.content ?? []} getRowKey={r => String(r.id)} emptyDescription="No users." />
      }

      {list.data && list.data.totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="self-center text-sm text-muted">Page {page + 1} / {list.data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= list.data.totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={open => { if (!open) setConfirmTarget(null) }}
        title={confirmTarget?.newRole === 'ADMIN' ? 'Promote to admin' : 'Demote to passenger'}
        description={`Change ${confirmTarget?.entry.fullName ?? ''}'s role to ${confirmTarget?.newRole ?? ''}? This will be logged.`}
        confirmLabel="Confirm"
        tone={confirmTarget?.newRole === 'PASSENGER' ? 'destructive' : 'default'}
        onConfirm={() => {
          if (confirmTarget) changeRole.mutate({ id: confirmTarget.entry.id, role: confirmTarget.newRole })
          setConfirmTarget(null)
        }}
      />
    </div>
  )
}
