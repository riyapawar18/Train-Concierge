import { Outlet } from 'react-router-dom'
import { TrainFront } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'

function TrackIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative my-10 h-48 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5"
    >
      <span className="absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-accent-orange/20 blur-3xl" />
      <span className="absolute inset-x-6 top-[42%] h-px bg-white/35" />
      <span className="absolute inset-x-6 top-[62%] h-px bg-white/35" />
      <span
        className="absolute inset-x-6 top-[42%] h-[20%] opacity-50"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgb(255 255 255 / 0.28) 0 2px, transparent 2px 20px)',
        }}
      />
      <span className="absolute top-1/2 left-[58%] grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-accent-orange text-brand-navy-dark shadow-[0_10px_30px_rgb(249_115_22_/_0.45)]">
        <TrainFront className="size-6" strokeWidth={2.2} />
      </span>
      <span className="absolute top-1/2 left-3 size-2 -translate-y-1/2 rounded-full bg-white/40" />
      <span className="absolute top-1/2 right-3 size-2 -translate-y-1/2 rounded-full bg-accent-orange" />
      <span className="absolute inset-x-0 bottom-4 flex justify-center">
        <span className="rounded-full border border-white/15 bg-brand-navy-dark/60 px-3 py-1 text-xs font-medium tracking-wide text-white/70">
          Recovery, reimagined
        </span>
      </span>
    </div>
  )
}

const highlights = [
  'Live disruption updates',
  'Alternative routes in one place',
  'Stays when plans change',
]

export function AuthLayout() {
  return (
    <div className="min-h-dvh bg-surface text-text lg:grid lg:grid-cols-2">
      <div className="relative flex min-h-dvh flex-col">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_100%_at_20%_0%,rgba(249,115,22,0.10),transparent_70%)]"
        />

        <header className="relative z-10 flex items-center justify-between px-5 pt-6 sm:px-8 lg:px-10">
          <BrandMark size="md" />
          <p className="text-xs tracking-[0.14em] text-muted uppercase lg:hidden">
            Your journey, protected
          </p>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#081a3f_0%,#12306b_55%,#0b1f4b_100%)] px-12 py-14 text-white lg:flex lg:min-h-dvh lg:flex-col lg:justify-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_15%_0%,rgba(249,115,22,0.16),transparent_55%)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-32 size-80 rounded-full bg-info/20 blur-3xl"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent-orange-soft uppercase">
            Passenger recovery concierge
          </p>
          <p className="mt-5 max-w-md text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-white">
            When plans change, your journey keeps moving.
          </p>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
            Alternatives, stays and live updates come together in one calm place, so a delay never
            leaves you stranded.
          </p>

          <TrackIllustration />

          <ul className="flex flex-wrap gap-2">
            {highlights.map((highlight) => (
              <li
                key={highlight}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80"
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-orange" />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
