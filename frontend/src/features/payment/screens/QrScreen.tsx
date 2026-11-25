import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MERCHANT_VPA, buildUpiUri } from '../methods'
import { formatExact } from '../transaction'
import type { MethodScreenProps } from '../types'
import { AppShell, useCountdown, useDelayedAction } from './shared'

const QR_NAVY = '#1e3a6e'
const DARK = '#10131a'
const SIZE = 29

// FNV-1a fold of the URI into a 32-bit seed, so the same QR always looks alike.
function hashSeed(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function inFinderZone(r: number, c: number): boolean {
  return (r < 8 && c < 8) || (r < 8 && c >= SIZE - 8) || (r >= SIZE - 8 && c < 8)
}

function inAlignZone(r: number, c: number): boolean {
  return r >= SIZE - 9 && r <= SIZE - 5 && c >= SIZE - 9 && c <= SIZE - 5
}

/** Deterministic QR-like matrix: seeded noise + finder/alignment modules. */
function buildMatrix(seed: number): boolean[] {
  const rng = mulberry32(seed)
  const cells: boolean[] = new Array(SIZE * SIZE).fill(false)
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (inFinderZone(r, c) || inAlignZone(r, c)) continue
      cells[r * SIZE + c] = rng() > 0.5
    }
  }
  const paint = (r0: number, c0: number, n: number) => {
    for (let dr = 0; dr < n; dr += 1) {
      for (let dc = 0; dc < n; dc += 1) {
        const edge = dr === 0 || dr === n - 1 || dc === 0 || dc === n - 1
        const core = n === 7 ? dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4 : dr === 2 && dc === 2
        cells[(r0 + dr) * SIZE + (c0 + dc)] = edge || core
      }
    }
  }
  paint(0, 0, 7)
  paint(0, SIZE - 7, 7)
  paint(SIZE - 7, 0, 7)
  paint(SIZE - 9, SIZE - 9, 5)
  return cells
}

function clockLabel(value: number): string {
  const safe = Math.max(0, value)
  const minutes = Math.floor(safe / 60)
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`
}

/**
 * Static UPI QR: renders the merchant code, its decoded string and the
 * confirmation that comes back once the payer's app has approved the debit.
 */
function QrScreen({ subject, onPay, onCancel, error }: MethodScreenProps) {
  const [verifying, setVerifying] = useState(false)
  const [salt, setSalt] = useState(0)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const { remaining, restart } = useCountdown(120)

  const uri = buildUpiUri({
    merchantVpa: MERCHANT_VPA,
    merchantName: 'TrainConcierge',
    amount: subject.amount,
    txnNote: subject.title,
  })
  const cells = useMemo(
    () => buildMatrix((hashSeed(uri) ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0),
    [uri, salt],
  )

  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
  }, [])

  useDelayedAction(
    () =>
      onPay({
        method: 'qr',
        methodLabel: 'UPI QR Code',
        payerReference: `Scanned from ${MERCHANT_VPA}`,
      }),
    1800,
    verifying,
  )

  const copy = async () => {
    const clip = navigator.clipboard
    if (!clip?.writeText) return
    try {
      await clip.writeText(uri)
      setCopied(true)
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard unavailable or blocked — stay silent, nothing else to do.
    }
  }

  return (
    <AppShell
      onCancel={verifying ? () => setVerifying(false) : onCancel}
      headerStyle={{ background: QR_NAVY, color: '#ffffff' }}
      brand={<span className="text-[17px] font-semibold tracking-tight text-white">Scan &amp; Pay</span>}
      statusText={`${formatExact(subject.amount)} · scan with any UPI app to pay TrainConcierge`}
      footer={
        verifying ? null : (
          <div className="flex flex-col gap-2">
            {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
            <Button
              className="w-full text-sm font-semibold"
              style={{ background: QR_NAVY, color: '#ffffff' }}
              onClick={() => setVerifying(true)}
            >
              I have completed the payment
            </Button>
          </div>
        )
      }
    >
      {verifying ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <LoaderCircle className="size-9 animate-spin" style={{ color: QR_NAVY }} aria-hidden="true" />
          <p className="text-sm font-semibold text-text">Fetching bank confirmation…</p>
          <p className="text-xs text-muted">Waiting for the confirmation from your bank.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-border bg-white p-4" style={{ background: '#ffffff' }}>
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              width={220}
              height={220}
              role="presentation"
              aria-hidden="true"
              shapeRendering="crispEdges"
            >
              <rect x={0} y={0} width={SIZE} height={SIZE} fill="#ffffff" />
              {cells.map((dark, index) =>
                dark ? (
                  <rect
                    key={index}
                    x={index % SIZE}
                    y={Math.floor(index / SIZE)}
                    width={1}
                    height={1}
                    fill={DARK}
                  />
                ) : null,
              )}
              <rect x={SIZE / 2 - 3} y={SIZE / 2 - 3} width={6} height={6} fill="#ffffff" />
              <rect x={SIZE / 2 - 2} y={SIZE / 2 - 2} width={4} height={4} fill={QR_NAVY} />
            </svg>
          </div>
          <p className="text-center text-xs text-muted">
            Scan with any UPI app to pay TrainConcierge {formatExact(subject.amount)}.
          </p>

          <div className="flex w-full flex-col gap-1.5">
            <p className="text-xs font-medium text-muted">Decoded UPI string</p>
            <div className="flex items-start gap-2">
              <p className="flex-1 select-all break-all rounded-lg bg-surface-muted px-3 py-2 font-mono text-[11px] text-text">
                {uri}
              </p>
              <Button variant="outline" size="sm" onClick={copy} aria-label="Copy UPI string">
                {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/50 px-3 py-2">
            <span className="text-xs text-muted tabular-nums">QR valid for {clockLabel(remaining)}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSalt((current) => current + 1)
                restart()
              }}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh QR
            </Button>
          </div>

          <p className="flex items-start gap-2 text-[11px] text-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            This QR is generated locally on your device. Scanning it moves no money and contacts no
            bank, PSP or UPI app.
          </p>
        </div>
      )}
    </AppShell>
  )
}

export { QrScreen }
