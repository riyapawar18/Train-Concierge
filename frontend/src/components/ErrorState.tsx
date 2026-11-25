import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  description: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-danger/20 bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-text">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted text-pretty">{description}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}

export { ErrorState, type ErrorStateProps }
