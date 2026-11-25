import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/ui/button'
import { useSession } from '@/app/SessionProvider'
import { homeForRole } from '@/lib/navigation'

export function AccessDeniedPage() {
  const { user } = useSession()
  const home = user ? homeForRole(user.role) : '/auth'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-page px-6 py-12 text-center">
      <BrandMark size="md" />
      <span
        aria-hidden="true"
        className="mt-10 grid size-12 place-items-center rounded-xl bg-danger-soft text-danger"
      >
        <ShieldX className="size-6" strokeWidth={2.2} />
      </span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text">Access denied</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted text-pretty">
        Your account does not have permission to open this area.
      </p>
      <Button asChild className="mt-6">
        <Link to={home}>Go to dashboard</Link>
      </Button>
    </div>
  )
}
