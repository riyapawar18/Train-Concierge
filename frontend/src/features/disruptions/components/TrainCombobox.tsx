import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronsUpDown, LoaderCircle, TrainFront } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTrainSuggestions } from '../api'
import type { TrainSuggestion } from '../types'

interface TrainComboboxProps {
  label: string
  value: TrainSuggestion | null
  onChange: (train: TrainSuggestion | null) => void
  placeholder?: string
  error?: string
  description?: string
  id?: string
}

function display(train: TrainSuggestion): string {
  return `${train.name} (${train.number})`
}

function TrainCombobox({
  label,
  value,
  onChange,
  placeholder = 'Train name or number',
  error,
  description,
  id,
}: TrainComboboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const listId = `${inputId}-listbox`
  const descriptionId = description ? `${inputId}-description` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState(value ? display(value) : '')
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setText(value ? display(value) : '')
    }
  }, [value])

  useEffect(() => {
    if (!open) {
      return
    }
    const timer = window.setTimeout(() => setDebounced(query), 200)
    return () => window.clearTimeout(timer)
  }, [open, query])

  const trainsQuery = useQuery({
    queryKey: ['admin-train-suggestions', debounced],
    queryFn: ({ signal }) => getTrainSuggestions(debounced, signal),
    enabled: open && debounced.trim().length > 0,
    staleTime: 5 * 60_000,
  })

  const suggestions = trainsQuery.data ?? []

  useEffect(() => {
    setActive(suggestions.length > 0 ? 0 : -1)
  }, [suggestions])

  const choose = (train: TrainSuggestion) => {
    onChange(train)
    setText(display(train))
    setOpen(false)
    setQuery('')
    setDebounced('')
    inputRef.current?.focus()
  }

  const handleChange = (next: string) => {
    setText(next)
    setQuery(next)
    setDebounced(next)
    setOpen(true)
    if (value) {
      onChange(null)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (suggestions.length === 0) {
        return
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => {
        const from = current < 0 ? (direction === 1 ? -1 : 0) : current
        return (from + direction + suggestions.length) % suggestions.length
      })
      return
    }
    if (event.key === 'Enter' && open && active >= 0 && suggestions[active]) {
      event.preventDefault()
      choose(suggestions[active])
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
      setText(value ? display(value) : '')
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={open && active >= 0 ? `${inputId}-option-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(descriptionId, errorId) || undefined}
          autoComplete="off"
          spellCheck={false}
          value={text}
          placeholder={placeholder}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false)
            setQuery('')
            setDebounced('')
            setText(value ? display(value) : '')
          }}
          onKeyDown={handleKeyDown}
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 pr-9 text-sm text-text placeholder:text-muted/70 focus-visible:border-brand-navy focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-navy aria-invalid:border-danger aria-invalid:outline-danger"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-muted">
          {trainsQuery.isFetching ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ChevronsUpDown className="size-4" aria-hidden="true" />
          )}
        </span>

        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-label={`${label} suggestions`}
            className="absolute top-full right-0 left-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-card"
          >
            {debounced.trim().length === 0 ? (
              <li role="presentation" className="px-3 py-2 text-sm text-muted">
                Type a train name or number.
              </li>
            ) : null}
            {trainsQuery.isLoading ? (
              <li role="presentation" className="px-3 py-2 text-sm text-muted">
                Searching trains…
              </li>
            ) : null}
            {debounced.trim().length > 0 && !trainsQuery.isLoading && suggestions.length === 0 ? (
              <li role="presentation" className="px-3 py-2 text-sm text-muted">
                No trains match “{debounced}”.
              </li>
            ) : null}
            {suggestions.map((train, index) => {
              const selected = value?.number === train.number
              return (
                <li
                  key={train.number}
                  id={`${inputId}-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm',
                    index === active ? 'bg-surface-muted' : 'bg-surface',
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(train)}
                >
                  <TrainFront className="mt-0.5 size-4 shrink-0 text-brand-navy" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium text-text">{train.name}</span>
                    <span className="truncate text-xs text-muted">
                      #{train.number} · {train.runsOn}
                    </span>
                  </span>
                  {selected ? (
                    <span className="text-xs font-semibold text-brand-navy">Selected</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
      {description && !error ? (
        <p id={descriptionId} className="text-xs text-muted">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { TrainCombobox, type TrainComboboxProps }
