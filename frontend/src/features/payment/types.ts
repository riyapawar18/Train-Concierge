/**
 * Domain model for the payment module.
 *
 * The module renders the brand-styled interfaces, collects the credentials each
 * method needs, then hands control back to the host flow through `onAuthorize`
 * — the project's own booking API.
 */

export type PaymentMethodId =
  | 'googlepay'
  | 'phonepe'
  | 'paytm'
  | 'upi'
  | 'qr'
  | 'card'
  | 'netbanking'

export interface SubjectLine {
  label: string
  value: string
}

/** The booking (or stay) being paid for — drives every payment screen. */
export interface PaymentSubject {
  /** Merchant line, e.g. "Deccan Queen · 12123". */
  title: string
  /** Journey or stay, e.g. "Pune Jn → Mumbai CSMT". */
  route: string
  /** When, e.g. "Tue, 4 Nov 2026 · AC 3 Tier · General". */
  schedule: string
  /** Extra key/value detail rows shown on the amount banner. */
  lines: SubjectLine[]
  /** Exact payable amount in rupees. */
  amount: number
  payerName: string
  payerMobile?: string
  payerEmail?: string
}

/** What a method screen reports back when the user authorises the payment. */
export interface PaymentAuthorization {
  method: PaymentMethodId
  methodLabel: string
  /** Human-readable account that "paid", e.g. "HDFC Bank · UPI asha@okhdfcbank". */
  payerReference: string
}

/** Returned by the host flow once the real booking/stay has been created. */
export interface PaymentConfirmation {
  referenceLabel: string
  reference: string
  summary: SubjectLine[]
  /** Where "View booking details" goes; omit to just close the overlay. */
  detailsPath?: string
}

export interface PaymentTransaction {
  transactionId: string
  bankReference: string
  method: PaymentMethodId
  methodLabel: string
  payerReference: string
  amount: number
  paidAt: string
  subject: PaymentSubject
  confirmation: PaymentConfirmation
}

export interface MethodScreenProps {
  subject: PaymentSubject
  /** Called by the method screen when the user has authorised the payment. */
  onPay: (authorization: PaymentAuthorization) => void
  /** Called when the user leaves the method screen. */
  onCancel: () => void
  /** Validation/authentication problem raised by the host flow. */
  error: string | null
}
