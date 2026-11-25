import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import { AlertTriangle, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RouteErrorPage() {
  const error = useRouteError()

  let title = 'Something went wrong'
  let message = 'An unexpected error occurred.'

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Page not found'
      message = "We couldn't find the page you were looking for."
    } else if (error.status === 403) {
      title = 'Access denied'
      message = "You don't have permission to view this page."
    } else {
      message = error.statusText || message
    }
  } else if (error instanceof Error) {
    message = import.meta.env.DEV ? error.message : message
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center bg-page">
      <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-7" aria-hidden="true" />
      </span>
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold text-text">{title}</h1>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button variant="cta" asChild>
          <Link to="/app/dashboard">
            <Home className="size-4" aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
