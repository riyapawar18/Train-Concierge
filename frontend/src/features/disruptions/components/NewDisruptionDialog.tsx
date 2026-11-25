import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Info, LoaderCircle, TriangleAlert, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { normalizeApiError, type NormalizedApiError } from '@/lib/apiClient'
import { cn } from '@/lib/utils'
import { formatLongDate, todayIso } from '@/features/travel/date'
import { createDisruption, previewDisruption } from '../api'
import {
  QUICK_DELAYS,
  REASON_PRESETS,
  SEVERITY_OPTIONS,
  TYPE_OPTIONS,
} from '../constants'
import type { DisruptionSeverity, DisruptionType, TrainSuggestion } from '../types'
import { TrainCombobox } from './TrainCombobox'

type FieldKey = 'trainNumber' | 'travelDate' | 'delayMinutes' | 'reason' | 'type' | 'severity'

type FieldErrors = Partial<Record<FieldKey, string>>

interface FormState {
  train: TrainSuggestion | null
  travelDate: string
  type: DisruptionType
  delayMinutes: string
  reason: string
  severity: DisruptionSeverity
}

function initialForm(): FormState {
  return {
    train: null,
    travelDate: todayIso(),
    type: 'DELAY',
    delayMinutes: '60',
    reason: '',
    severity: 'MEDIUM',
  }
}

function parseDelay(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) {
    return null
  }
  return Number(value)
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.train) {
    errors.trainNumber = 'Choose a train.'
  }
  if (!form.travelDate) {
    errors.travelDate = 'Choose a travel date.'
  }
  if (form.type === 'DELAY') {
    const delay = parseDelay(form.delayMinutes)
    if (delay === null || delay < 5 || delay > 1440) {
      errors.delayMinutes = 'Enter a delay between 5 minutes and 24 hours.'
    }
  }
  const reason = form.reason.trim()
  if (!reason) {
    errors.reason = 'Choose or enter a reason.'
  } else if (reason.length > 190) {
    errors.reason = 'Keep the reason under 190 characters.'
  }
  return errors
}

function messageFor(error: unknown): string {
  return normalizeApiError(error).message
}

function fieldErrorsFrom(error: unknown): FieldErrors {
  const normalized = normalizeApiError(error) as NormalizedApiError
  const errors: FieldErrors = {}
  for (const item of normalized.fieldErrors) {
    if (
      item.field === 'trainNumber' ||
      item.field === 'travelDate' ||
      item.field === 'delayMinutes' ||
      item.field === 'reason' ||
      item.field === 'type' ||
      item.field === 'severity'
    ) {
      errors[item.field] = item.message
    }
  }
  return errors
}

interface NewDisruptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (id: number) => void
}

function NewDisruptionDialog({ open, onOpenChange, onCreated }: NewDisruptionDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm(initialForm())
      setErrors({})
      setFormError(null)
    }
  }, [open])

  const patch = (next: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...next }))
    setFormError(null)
  }

  const delayValue = parseDelay(form.delayMinutes)
  const delayValid = form.type === 'CANCELLATION' || (delayValue !== null && delayValue >= 5 && delayValue <= 1440)
  const canPreview = Boolean(form.train) && Boolean(form.travelDate) && delayValid

  const preview = useQuery({
    queryKey: [
      'disruption-preview',
      form.train?.number,
      form.travelDate,
      form.type,
      form.type === 'DELAY' ? delayValue : null,
    ],
    queryFn: () =>
      previewDisruption({
        trainNumber: form.train?.number ?? '',
        travelDate: form.travelDate,
        type: form.type,
        delayMinutes: form.type === 'DELAY' ? delayValue : null,
        reason: form.reason.trim() || 'Checking impact',
        severity: form.severity,
      }),
    enabled: open && canPreview,
    staleTime: 0,
    retry: false,
  })

  const previewError = preview.isError ? normalizeApiError(preview.error) : null

  const mutation = useMutation({
    mutationFn: () =>
      createDisruption({
        trainNumber: form.train?.number ?? '',
        travelDate: form.travelDate,
        type: form.type,
        delayMinutes: form.type === 'DELAY' ? delayValue : null,
        reason: form.reason.trim(),
        severity: form.severity,
      }),
    onSuccess: (response) => {
      toast({
        title: 'Disruption logged',
        description: `${response.trainNumber} on ${formatLongDate(response.travelDate)} · ${response.affectedPassengers} passenger${
          response.affectedPassengers === 1 ? '' : 's'
        } affected.`,
        tone: 'success',
      })
      void queryClient.invalidateQueries({ queryKey: ['admin-disruptions'] })
      void queryClient.invalidateQueries({ queryKey: ['my-disruptions'] })
      void queryClient.invalidateQueries({ queryKey: ['journeys'] })
      void queryClient.invalidateQueries({ queryKey: ['journeys-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['train-status'] })
      void queryClient.invalidateQueries({ queryKey: ['journey'] })
      onCreated?.(response.id)
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      setErrors(fieldErrorsFrom(error))
      setFormError(messageFor(error))
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Please check the highlighted fields.')
      return
    }
    setFormError(null)
    mutation.mutate()
  }

  const previewTone = useMemo(() => {
    if (!preview.data) {
      return 'muted'
    }
    return preview.data.affectedPassengers > 0 ? 'danger' : 'muted'
  }, [preview.data])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log a disruption</DialogTitle>
          <DialogDescription>
            Record a delay or cancellation. We will work out which confirmed bookings are affected
            and prepare alternative journeys.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          {formError ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {formError}
            </p>
          ) : null}

          <TrainCombobox
            id="disruption-train"
            label="Train"
            value={form.train}
            error={errors.trainNumber}
            description="Search the catalogue by train name or number."
            onChange={(train) => {
              patch({ train })
              setErrors((current) => ({ ...current, trainNumber: undefined }))
            }}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="disruption-date"
              label="Travel date"
              type="date"
              value={form.travelDate}
              error={errors.travelDate}
              min={todayIso()}
              onChange={(event) => {
                patch({ travelDate: event.target.value })
                setErrors((current) => ({ ...current, travelDate: undefined }))
              }}
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Type</span>
              <select
                id="disruption-type"
                value={form.type}
                onChange={(event) => {
                  patch({ type: event.target.value as DisruptionType })
                  setErrors((current) => ({ ...current, delayMinutes: undefined, type: undefined }))
                }}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {form.type === 'DELAY' ? (
            <div className="flex flex-col gap-1.5">
              <Input
                id="disruption-delay"
                label="Delay (minutes)"
                inputMode="numeric"
                value={form.delayMinutes}
                error={errors.delayMinutes}
                onChange={(event) => {
                  patch({ delayMinutes: event.target.value.replace(/\D/g, '').slice(0, 4) })
                  setErrors((current) => ({ ...current, delayMinutes: undefined }))
                }}
              />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quick delay options">
                {QUICK_DELAYS.map((minutes) => {
                  const active = delayValue === minutes
                  return (
                    <button
                      key={minutes}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        patch({ delayMinutes: String(minutes) })
                        setErrors((current) => ({ ...current, delayMinutes: undefined }))
                      }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-brand-navy bg-brand-navy text-white'
                          : 'border-border bg-surface text-text hover:bg-surface-muted',
                      )}
                    >
                      {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Input
              id="disruption-reason"
              label="Reason"
              value={form.reason}
              error={errors.reason}
              maxLength={190}
              placeholder="For example, signal failure near Lonavala"
              onChange={(event) => {
                patch({ reason: event.target.value })
                setErrors((current) => ({ ...current, reason: undefined }))
              }}
            />
            <div className="flex flex-wrap gap-2" role="group" aria-label="Reason suggestions">
              {REASON_PRESETS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    patch({ reason })
                    setErrors((current) => ({ ...current, reason: undefined }))
                  }}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted transition-colors hover:bg-surface-muted hover:text-text"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Severity</span>
            <select
              id="disruption-severity"
              value={form.severity}
              onChange={(event) => patch({ severity: event.target.value as DisruptionSeverity })}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-brand-navy"
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div
            aria-live="polite"
            className={cn(
              'rounded-lg border px-3 py-2.5 text-sm',
              previewTone === 'danger'
                ? 'border-danger/20 bg-danger-soft text-danger'
                : 'border-border bg-surface-muted text-text',
            )}
          >
            {!canPreview ? (
              <p className="flex items-center gap-2 text-muted">
                <Info className="size-4 shrink-0" aria-hidden="true" />
                Choose a train and date to preview the confirmed passengers affected.
              </p>
            ) : preview.isLoading ? (
              <p className="flex items-center gap-2 text-muted">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Checking who is affected…
              </p>
            ) : previewError ? (
              <p className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {previewError.message}
              </p>
            ) : preview.data ? (
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold">{preview.data.message}</span>
                  <span className="ml-1 text-xs opacity-80">
                    ({preview.data.confirmedBookings} confirmed booking
                    {preview.data.confirmedBookings === 1 ? '' : 's'})
                  </span>
                </span>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cta" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <CalendarDays aria-hidden="true" />
              )}
              Log disruption
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { NewDisruptionDialog, type NewDisruptionDialogProps }
