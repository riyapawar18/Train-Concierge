import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Settings } from 'lucide-react'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { normalizeApiError } from '@/lib/apiClient'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/features/notifications/api'
import type { NotificationPreferences } from '@/features/notifications/types'

interface PreferenceRow {
  key: keyof NotificationPreferences
  label: string
  description: string
}

const PREFERENCE_ROWS: PreferenceRow[] = [
  {
    key: 'emailEnabled',
    label: 'Email notifications',
    description: 'Send journey updates to the email address registered on your account.',
  },
  {
    key: 'disruptionAlertsEnabled',
    label: 'Disruption alerts',
    description: 'Tell me when a delay or cancellation affects one of my journeys.',
  },
  {
    key: 'seatAlertsEnabled',
    label: 'Seat alerts',
    description: 'Tell me when seats on a route I searched are running low.',
  },
  {
    key: 'announcementsEnabled',
    label: 'Announcements',
    description: 'Share general service news and announcements with me.',
  },
]

function SettingsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const preferences = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  })

  const [draft, setDraft] = useState<NotificationPreferences | null>(null)

  useEffect(() => {
    if (preferences.data) {
      setDraft(preferences.data)
    }
  }, [preferences.data])

  const save = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (saved) => {
      setDraft(saved)
      queryClient.setQueryData(['notification-preferences'], saved)
      toast({
        title: 'Preferences saved',
        description: 'Your notification choices have been updated.',
        tone: 'success',
      })
    },
  })

  const dirty =
    draft !== null &&
    preferences.data !== undefined &&
    (Object.keys(draft) as Array<keyof NotificationPreferences>).some(
      (key) => draft[key] !== preferences.data?.[key],
    )

  const toggle = (key: keyof NotificationPreferences, value: boolean) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Account settings"
        description="Choose how TrainConcierge keeps you informed about your journeys."
        eyebrow="Your account"
      />

      {preferences.isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface" aria-label="Loading settings" />
      ) : preferences.isError ? (
        <ErrorState
          title="We could not load your settings"
          description={normalizeApiError(preferences.error).message}
          onRetry={() => void preferences.refetch()}
        />
      ) : draft ? (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-0">
            <span className="grid size-9 place-items-center rounded-full bg-surface-muted text-brand-navy">
              <BellRing className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Notifications</CardTitle>
              <p className="mt-0.5 text-sm text-muted">
                These preferences control the messages you receive in the app and by email.
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-2">
            {PREFERENCE_ROWS.map((row) => (
              <div
                key={row.key}
                className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{row.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{row.description}</p>
                </div>
                <Switch
                  checked={draft[row.key]}
                  onCheckedChange={(checked) => toggle(row.key, checked)}
                  label={row.label}
                  disabled={save.isPending}
                />
              </div>
            ))}

            {save.isError ? (
              <p role="alert" className="pt-2 text-sm text-danger">
                {normalizeApiError(save.error).message}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-3">
              <Button onClick={() => draft && save.mutate(draft)} disabled={!dirty || save.isPending}>
                {save.isPending ? 'Saving…' : 'Save preferences'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => preferences.data && setDraft(preferences.data)}
                disabled={!dirty || save.isPending}
              >
                Undo changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
          <Settings className="size-4" aria-hidden="true" />
          Your settings will appear once your account finishes loading.
        </div>
      )}
    </div>
  )
}

export { SettingsPage }
