/**
 * Generates and downloads a reserved-ticket PDF for a booking.
 *
 * Uses only the built-in browser APIs (Canvas + window.print trick via a
 * hidden iframe with CSS @media print) — no external PDF library needed.
 * The ticket matches the standard Indian Railways reserved-ticket format:
 * PNR, train, date, class, quota, passenger list with berths, fare.
 */

export interface TicketPassenger {
  name: string
  age: number
  gender: string
  seatLabel: string
  berthType?: string | null
  coachNo?: string | null
}

export interface TicketData {
  pnr: string
  trainNumber: string
  trainName: string
  travelDate: string        // ISO date "YYYY-MM-DD"
  boardingTime: string      // ISO datetime
  arrivalTime: string       // ISO datetime
  fromCode: string
  fromName: string
  toCode: string
  toName: string
  classCode: string
  className: string
  quota: string
  passengers: TicketPassenger[]
  fare: {
    baseFare: number
    reservationCharge: number
    gst: number
    totalFare: number
  }
  contactMobile?: string | null
  contactEmail?: string | null
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00')
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return '' }
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
}

function genderShort(g: string): string {
  if (!g) return ''
  const upper = g.toUpperCase()
  if (upper === 'MALE') return 'M'
  if (upper === 'FEMALE') return 'F'
  return 'O'
}

/** Builds the HTML content of the ticket page */
function buildTicketHtml(ticket: TicketData): string {
  const passengerRows = ticket.passengers.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.age}</td>
      <td>${genderShort(p.gender)}</td>
      <td>${p.seatLabel ?? '—'}</td>
      <td>${p.berthType ?? '—'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>TrainConcierge Ticket – ${ticket.pnr}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
  body { background: #fff; color: #111; font-size: 11px; }

  .ticket { border: 2px solid #1a3a6b; max-width: 190mm; margin: auto; }

  .header { background: #1a3a6b; color: #fff; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; }
  .header .logo { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
  .header .subtitle { font-size: 9px; opacity: 0.85; margin-top: 2px; }
  .header .ticket-type { font-size: 13px; font-weight: bold; text-align: right; }

  .pnr-bar { background: #f0f4ff; border-bottom: 1px solid #1a3a6b; padding: 6px 12px; display: flex; align-items: center; gap: 24px; }
  .pnr-bar .pnr-label { font-size: 9px; text-transform: uppercase; color: #555; }
  .pnr-bar .pnr-value { font-size: 22px; font-weight: bold; letter-spacing: 4px; color: #1a3a6b; }
  .pnr-bar .status { margin-left: auto; font-size: 10px; font-weight: bold; color: #197a42; border: 1px solid #197a42; padding: 2px 8px; border-radius: 4px; }

  .section { padding: 8px 12px; border-bottom: 1px solid #ddd; }
  .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 5px; letter-spacing: 0.5px; }

  .train-info { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; }
  .station { line-height: 1.3; }
  .station .code { font-size: 20px; font-weight: bold; color: #1a3a6b; }
  .station .name { font-size: 9px; color: #555; }
  .station .time { font-size: 13px; font-weight: bold; color: #111; margin-top: 2px; }
  .arrow { text-align: center; font-size: 18px; color: #1a3a6b; }

  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .meta-item .label { font-size: 9px; text-transform: uppercase; color: #666; }
  .meta-item .value { font-size: 11px; font-weight: bold; color: #111; margin-top: 1px; }

  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #e8edf6; color: #1a3a6b; padding: 4px 6px; text-align: left; font-size: 9px; text-transform: uppercase; }
  td { padding: 4px 6px; border-bottom: 1px solid #eee; }
  tr:last-child td { border-bottom: none; }

  .fare-section { display: flex; gap: 20px; }
  .fare-table { flex: 1; }
  .fare-table dl { display: grid; grid-template-columns: 1fr auto; gap: 3px 12px; }
  .fare-table dl dt { color: #555; }
  .fare-table dl dd { text-align: right; font-weight: bold; }
  .fare-total { border-top: 1px solid #1a3a6b; padding-top: 4px; margin-top: 4px; font-size: 12px; }

  .footer { background: #f0f4ff; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #555; }
  .barcode { font-size: 14px; letter-spacing: 3px; font-family: 'Courier New'; color: #1a3a6b; }

  .disclaimer { font-size: 8px; color: #888; padding: 4px 12px 6px; line-height: 1.5; }
</style>
</head>
<body>
<div class="ticket">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">🚂 TRAINCONCIERGE</div>
      <div class="subtitle">E-Ticket · Reserved Accommodation</div>
    </div>
    <div class="ticket-type">RESERVED TICKET</div>
  </div>

  <!-- PNR bar -->
  <div class="pnr-bar">
    <div>
      <div class="pnr-label">PNR Number</div>
      <div class="pnr-value">${ticket.pnr}</div>
    </div>
    <div>
      <div class="pnr-label">Travel Date</div>
      <div style="font-size:14px;font-weight:bold;color:#1a3a6b">${formatDate(ticket.travelDate)}</div>
    </div>
    <div class="status">CONFIRMED</div>
  </div>

  <!-- Train route -->
  <div class="section">
    <div class="section-title">Journey Details</div>
    <div class="train-info">
      <div class="station">
        <div class="code">${ticket.fromCode}</div>
        <div class="name">${ticket.fromName}</div>
        <div class="time">${formatTime(ticket.boardingTime)}</div>
      </div>
      <div class="arrow">→</div>
      <div class="station" style="text-align:right">
        <div class="code">${ticket.toCode}</div>
        <div class="name">${ticket.toName}</div>
        <div class="time">${formatTime(ticket.arrivalTime)}</div>
      </div>
    </div>
  </div>

  <!-- Train meta -->
  <div class="section">
    <div class="meta-grid">
      <div class="meta-item">
        <div class="label">Train</div>
        <div class="value">${ticket.trainNumber}</div>
        <div style="font-size:9px;color:#555">${ticket.trainName}</div>
      </div>
      <div class="meta-item">
        <div class="label">Class</div>
        <div class="value">${ticket.classCode}</div>
        <div style="font-size:9px;color:#555">${ticket.className}</div>
      </div>
      <div class="meta-item">
        <div class="label">Quota</div>
        <div class="value">${ticket.quota}</div>
      </div>
      <div class="meta-item">
        <div class="label">Passengers</div>
        <div class="value">${ticket.passengers.length}</div>
      </div>
    </div>
  </div>

  <!-- Passengers -->
  <div class="section">
    <div class="section-title">Passenger Details</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Age</th>
          <th>Sex</th>
          <th>Seat/Berth</th>
          <th>Berth Type</th>
        </tr>
      </thead>
      <tbody>
        ${passengerRows}
      </tbody>
    </table>
  </div>

  <!-- Fare -->
  <div class="section">
    <div class="section-title">Fare Details</div>
    <div class="fare-section">
      <div class="fare-table">
        <dl>
          <dt>Base Fare</dt><dd>${formatINR(ticket.fare.baseFare)}</dd>
          <dt>Reservation Charge</dt><dd>${formatINR(ticket.fare.reservationCharge)}</dd>
          <dt>GST (5%)</dt><dd>${formatINR(ticket.fare.gst)}</dd>
        </dl>
        <dl class="fare-total">
          <dt style="font-weight:bold">Total Fare</dt><dd style="font-size:13px;color:#1a3a6b">${formatINR(ticket.fare.totalFare)}</dd>
        </dl>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      ${ticket.contactEmail ? `Email: ${ticket.contactEmail}` : ''}
      ${ticket.contactMobile ? ` &nbsp;|&nbsp; Mobile: ${ticket.contactMobile}` : ''}
    </div>
    <div class="barcode">${ticket.pnr}</div>
    <div>Printed: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
  </div>

  <div class="disclaimer">
    This is a TrainConcierge booking confirmation. It is not a valid travel document
    on Indian Railways.
  </div>
</div>
</body>
</html>`
}

/**
 * Downloads the ticket as a PDF by opening it in a hidden iframe and
 * triggering the browser's print-to-PDF dialog.
 */
export function downloadTicket(ticket: TicketData): void {
  const html = buildTicketHtml(ticket)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe)
        URL.revokeObjectURL(url)
      }, 1000)
    }
  }
  iframe.src = url
}

/**
 * Builds a WhatsApp share URL with the ticket summary.
 * Opens wa.me with the mobile number pre-filled (if provided).
 */
export function buildWhatsAppUrl(ticket: TicketData, mobile?: string | null): string {
  const text = [
    `🚂 *TrainConcierge — Booking Confirmed*`,
    `PNR: *${ticket.pnr}*`,
    `Train: ${ticket.trainName} (${ticket.trainNumber})`,
    `Date: ${formatDate(ticket.travelDate)}`,
    `${ticket.fromCode} → ${ticket.toCode}`,
    `Class: ${ticket.className} (${ticket.classCode})`,
    `Passengers: ${ticket.passengers.map(p => `${p.name} · ${p.seatLabel}`).join(', ')}`,
    `Total Fare: ${formatINR(ticket.fare.totalFare)}`,
  ].join('\n')

  const encoded = encodeURIComponent(text)

  // Normalise mobile: remove spaces/dashes, ensure it starts with country code
  let phone = ''
  if (mobile) {
    const digits = mobile.replace(/[\s\-()]/g, '')
    // Add India country code if it looks like a 10-digit local number
    phone = digits.startsWith('+') ? digits.replace('+', '') : digits.length === 10 ? `91${digits}` : digits
  }

  return phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
}
