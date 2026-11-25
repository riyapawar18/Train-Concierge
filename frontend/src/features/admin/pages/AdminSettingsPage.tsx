import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { normalizeApiError } from '@/lib/apiClient'
import { getAdminSettings, updateSetting } from '../api'

export function AdminSettingsPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const settings = useQuery({ queryKey: ['admin-settings'], queryFn: getAdminSettings })

  const [draft, setDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    if (settings.data) {
      const map: Record<string, string> = {}
      settings.data.forEach(s => { map[s.key] = s.value })
      setDraft(map)
    }
  }, [settings.data])

  const save = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => updateSetting(key, value),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-settings'] })
      toast({ title: 'Setting saved', tone: 'success' })
    },
    onError: (e) => toast({ title: normalizeApiError(e).message, tone: 'danger' }),
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="System Settings" description="Operational defaults. Changes take effect immediately." />

      {settings.isLoading && <div className="h-48 animate-pulse rounded-xl bg-surface" />}

      {settings.data && (
        <Card>
          <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {settings.data.map(s => (
                <li key={s.key} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-text font-mono text-sm">{s.key}</p>
                    <p className="text-xs text-muted">{s.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      type="number"
                      value={draft[s.key] ?? s.value}
                      onChange={e => setDraft(d => ({ ...d, [s.key]: e.target.value }))}
                      className="h-9 w-24 rounded-lg border border-border bg-surface px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-navy"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(draft[s.key] ?? s.value) === s.value || save.isPending}
                      onClick={() => save.mutate({ key: s.key, value: draft[s.key] ?? s.value })}
                    >
                      Save
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
