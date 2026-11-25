import { TrainFront } from 'lucide-react'

export function TrackAnimation() {
  return (
    <div className="splash-track" aria-hidden="true">
      <div className="splash-track__line">
        <span className="splash-track__sleepers" />
        <span className="splash-track__rail splash-track__rail--top" />
        <span className="splash-track__rail splash-track__rail--bottom" />
        <span className="splash-track__train">
          <TrainFront strokeWidth={2.4} />
        </span>
      </div>
    </div>
  )
}
