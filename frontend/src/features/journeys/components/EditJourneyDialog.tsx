import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { normalizeApiError } from '@/lib/apiClient'
import { updateJourney } from '../api'
import { canRenamePassengers } from '../constants'
import type { JourneyDetail } from '../types'

interface EditJourneyDialogProps {
  journey: JourneyDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function EditJourneyDialog({ journey, open, onOpenChange }: EditJourneyDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [names, setNames] = useState<Array<{ id: number; name: string }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !journey) {
      return
    }
    setTitle(journey.title ?? '')
    setNotes(journey.notes ?? '')
    setNames(journey.passengers.map((passenger) => ({ id: passenger.id, name: passenger.name })))
    setError(null)
  }, [open, journey])

  const mutation = useMutation({
    mutationFn: (input: { title?: string; notes?: string; passengers?: Array<{ id: number; name: string }> }) =>
      updateJourney(journey?.id ?? 0, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(['journey', updated.id], updated)
      void queryClient.invalidateQueries({ queryKey: ['journeys'] })
      void queryClient.invalidateQueries({ queryKey: ['journeys-summary'] })
      toast({ title: 'Journey updated', tone: 'success' })
      onOpenChange(false)
    },
    onError: (cause: unknown) => {
      setError(normalizeApiError(cause).message)
    },
  })

  const renameAllowed = journey ? canRenamePassengers(journey.status) : false

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!journey) {
      return
    }
    if (names.some((passenger) => passenger.name.trim().length < 2)) {
      setError('Enter a name for every passenger.')
      return
    }
    setError(null)
    mutation.mutate({
      title: title.trim(),
      notes: notes.trim(),
      ...(renameAllowed ? { passengers: names.map((passenger) => ({ ...passenger, name: passenger.name.trim() })) } : {}),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit journey</DialogTitle>
          <DialogDescription>
            Update the title, notes{renameAllowed ? ' and passenger names' : ''}. Travel date, train
            and seats cannot be changed here.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={submit} className="flex flex-col gap-3">
          <Input
            id="journey-title"
            label="Journey title"
            maxLength={120}
            placeholder="e.g. Mumbai weekend with Neha"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="flex w-full flex-col gap-1.5">
            <label htmlFor="journey-notes" className="text-sm font-medium text-text">
              Notes
            </label>
            <textarea
              id="journey-notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70 focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-navy"
              placeholder="Anything you want to remember about this trip."
            />
            <p className="text-xs text-muted">Up to 500 characters.</p>
          </div>

          {renameAllowed && names.length > 0 ? (
            <fieldset className="flex flex-col gap-2 rounded-xl border border-border p-3">
              <legend className="px-1 text-sm font-medium text-text">Passenger names</legend>
              {names.map((passenger, index) => (
                <Input
                  key={passenger.id}
                  id={`journey-passenger-${passenger.id}`}
                  label={`Passenger ${index + 1}`}
                  value={passenger.name}
                  onChange={(event) =>
                    setNames((current) =>
                      current.map((item) =>
                        item.id === passenger.id ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                />
              ))}
            </fieldset>
          ) : (
            <p className="text-xs text-muted">
              Passenger names can only be changed before departure.
            </p>
          )}

          {error ? (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cta" disabled={mutation.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { EditJourneyDialog, type EditJourneyDialogProps }
