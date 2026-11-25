import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="size-7" aria-hidden="true" />
          </span>
          <div className="max-w-sm">
            <h2 className="text-lg font-semibold text-text">Something went wrong</h2>
            <p className="mt-1 text-sm text-muted">
              An unexpected error occurred. Try refreshing the page or going back.
            </p>
            {import.meta.env.DEV && this.state.error ? (
              <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-surface-muted p-3 text-left text-[11px] text-danger">
                {this.state.error.message}
              </pre>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.reset}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
            <Button variant="cta" onClick={() => window.location.replace('/app/dashboard')}>
              Go to dashboard
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
