import { Link } from 'react-router-dom'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-page px-6 py-12 text-center">
      <BrandMark size="md" />
      <p className="mt-10 text-xs font-semibold tracking-[0.18em] text-muted uppercase">
        Error 404
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">Page not found</h1>
      <p className="mt-3 max-w-sm text-sm text-muted text-pretty">
        The page you are looking for does not exist or may have moved.
      </p>
      <Button asChild className="mt-6">
        <Link to="/auth">Back to sign in</Link>
      </Button>
    </div>
  )
}
