import type { PaymentTransaction } from './types'
import { formatExact, formatPaidAt } from './transaction'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function row(label: string, value: string, emphasis = false): string {
  return `<div class="row"><span>${escapeHtml(label)}</span><b class="${emphasis ? 'amount' : ''}">${escapeHtml(value)}</b></div>`
}

function buildReceiptHtml(txn: PaymentTransaction): string {
  const confirmation = txn.confirmation
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Payment Receipt – ${escapeHtml(txn.transactionId)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #14213d; background: #fff; font-size: 12px; }
  .sheet { max-width: 170mm; margin: auto; border: 1px solid #d8dee9; border-radius: 8px; overflow: hidden; }
  .head { background: #1e3a6e; color: #fff; padding: 14px 18px; display: flex; justify-content: space-between; align-items: flex-start; }
  .head .brand { font-size: 17px; font-weight: 700; letter-spacing: 0.5px; }
  .head .sub { font-size: 9px; opacity: 0.85; margin-top: 3px; }
  .head .doc { text-align: right; font-size: 12px; font-weight: 700; letter-spacing: 1px; }
  .head .doc small { display: block; font-weight: 400; font-size: 9px; opacity: 0.85; margin-top: 2px; letter-spacing: 0; }
  .banner { background: #dcfce7; color: #166534; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .banner .state { font-size: 14px; font-weight: 700; }
  .banner .paid { font-size: 18px; font-weight: 700; }
  section { padding: 12px 18px; border-bottom: 1px solid #eef2f8; }
  h2 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.6px; color: #5b6b87; margin-bottom: 7px; }
  .row { display: flex; justify-content: space-between; gap: 16px; padding: 3px 0; }
  .row span { color: #5b6b87; }
  .row b { text-align: right; font-weight: 600; }
  .row .amount { color: #1e3a6e; font-size: 13px; }
  .total { border-top: 1px solid #d8dee9; margin-top: 6px; padding-top: 6px; }
  .foot { padding: 10px 18px; background: #f3f5f9; font-size: 9px; color: #5b6b87; line-height: 1.6; }
  .mono { font-family: 'Courier New', monospace; }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div>
      <div class="brand">TRAINCONCIERGE</div>
      <div class="sub">Passenger recovery &amp; booking platform</div>
    </div>
    <div class="doc">
      PAYMENT RECEIPT
      <small>${escapeHtml(confirmation.referenceLabel)} ${escapeHtml(confirmation.reference)}</small>
    </div>
  </div>

  <div class="banner">
    <div class="state">Payment successful</div>
    <div class="paid">${escapeHtml(formatExact(txn.amount))}</div>
  </div>

  <section>
    <h2>Transaction</h2>
    ${row('Transaction ID', txn.transactionId)}
    ${row('Bank / PSP reference', txn.bankReference)}
    ${row('Date &amp; time', formatPaidAt(txn.paidAt))}
    ${row('Payment method', txn.methodLabel)}
    ${row('Paid from', txn.payerReference)}
    ${row('Status', 'SUCCESS')}
  </section>

  <section>
    <h2>${escapeHtml(confirmation.referenceLabel)} details</h2>
    ${row('Reference', confirmation.reference)}
    ${confirmation.summary
      .map((line) => row(line.label, line.value))
      .join('\n    ')}
  </section>

  <section>
    <h2>Booking</h2>
    ${row('Item', txn.subject.title)}
    ${row('Route / stay', txn.subject.route)}
    ${row('Schedule', txn.subject.schedule)}
    ${row('Passenger / guest', txn.subject.payerName)}
    <div class="row total"><span>Total paid</span><b class="amount">${escapeHtml(formatExact(txn.amount))}</b></div>
  </section>

  <div class="foot">
    <p>
      This is a system-generated payment receipt and does not require a signature.
      Quote the transaction ID above for any payment-related queries.
    </p>
  </div>
</div>
</body>
</html>`
}

/** Prints the receipt through a hidden iframe, matching the e-ticket download path. */
export function downloadPaymentReceipt(txn: PaymentTransaction): void {
  const html = buildReceiptHtml(txn)
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))

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
      window.setTimeout(() => {
        document.body.removeChild(iframe)
        URL.revokeObjectURL(url)
      }, 1000)
    }
  }
  iframe.src = url
}
