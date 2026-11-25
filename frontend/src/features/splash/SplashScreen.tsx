import { TrainFront } from 'lucide-react'
import { TrackAnimation } from './TrackAnimation'
import { useSplashGate } from './useSplashGate'
import './splash.css'

export function SplashScreen() {
  const { progress, fading } = useSplashGate()
  const percent = Math.round(progress * 100)

  return (
    <div className={`splash${fading ? ' splash--fading' : ''}`} data-testid="splash-screen">
      <span className="splash__glow splash__glow--top" aria-hidden="true" />
      <span className="splash__glow splash__glow--bottom" aria-hidden="true" />

      <main className="splash__content">
        <div className="splash__brand">
          <span className="splash__mark" aria-hidden="true">
            <TrainFront strokeWidth={2.2} />
          </span>
          <h1 className="splash__wordmark">TrainConcierge</h1>
        </div>

        <p className="splash__tagline">Your journey, protected.</p>

        <TrackAnimation />

        <div className="splash__status">
          <div
            className="splash__progress"
            role="progressbar"
            aria-label="Checking your session"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span className="splash__progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="splash__status-text" role="status">
            {fading ? 'Welcome aboard' : 'Checking your session…'}
          </p>
        </div>
      </main>
    </div>
  )
}
