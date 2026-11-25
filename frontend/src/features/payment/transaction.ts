import type { PaymentMethodId } from './types'

const HEX = '0123456789abcdef'

/** Prefixes mirror how each provider labels its own references. */
const ID_PREFIX: Record<PaymentMethodId, string> = {
  googlepay: 'txn_gp',
  phonepe: 'pp',
  paytm: 'paytm',
  upi: 'upi',
  qr: 'qr',
  card: 'cc',
  netbanking: 'nb',
}

function pick(source: string, count: number): string {
  const cryptoRef = globalThis.crypto
  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(count)
    cryptoRef.getRandomValues(bytes)
    let out = ''
    for (const byte of bytes) {
      out += source[byte % source.length]
    }
    return out
  }
  let out = ''
  for (let index = 0; index < count; index += 1) {
    out += source[Math.floor(Math.random() * source.length)]
  }
  return out
}

export function generateTransactionId(method: PaymentMethodId): string {
  return `${ID_PREFIX[method]}${pick(HEX, 12)}`
}

/** Banks quote a long numeric reference alongside the PSP id. */
export function generateBankReference(): string {
  return `8${pick('0123456789', 11)}${pick('0123456789', 5)}`
}

export function generatePaymentReference(): string {
  return pick('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8)
}

const INR_EXACT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Payable amounts are shown to the paise, unlike the rounded ticket fares. */
export function formatExact(amount: number): string {
  return INR_EXACT.format(amount)
}

export function formatPaidAt(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export function maskMobile(mobile?: string | null): string {
  const digits = (mobile ?? '').replace(/\D/g, '')
  if (digits.length < 6) return '98XXXX XX10'
  const tail = digits.slice(-2)
  const head = digits.slice(-10, -8)
  return `98${head || 'XX'}XX XX${tail}`
}

export function maskCard(number: string): string {
  const digits = number.replace(/\D/g, '')
  const last4 = digits.slice(-4)
  return `**** **** **** ${last4 || '0000'}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Standard credit-card checksum — used to reject obviously wrong card numbers. */
export function passesLuhn(number: string): boolean {
  const digits = number.replace(/\D/g, '')
  if (digits.length < 12) return false
  let sum = 0
  let double = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = Number(digits[index])
    if (double) {
      value *= 2
      if (value > 9) value -= 9
    }
    sum += value
    double = !double
  }
  return sum % 10 === 0
}

export interface CardBrand {
  id: string
  label: string
  /** Matches the leading digits a passenger types. */
  test: (digits: string) => boolean
  lengths: number[]
  cvvLength: number
}

export const CARD_BRANDS: CardBrand[] = [
  { id: 'visa', label: 'VISA', test: (d) => /^4/.test(d), lengths: [13, 16, 19], cvvLength: 3 },
  {
    id: 'mastercard',
    label: 'Mastercard',
    test: (d) => /^(5[1-5]|2[2-7])/.test(d),
    lengths: [16],
    cvvLength: 3,
  },
  {
    id: 'amex',
    label: 'American Express',
    test: (d) => /^3[47]/.test(d),
    lengths: [15],
    cvvLength: 4,
  },
  {
    id: 'rupee',
    label: 'RuPay',
    test: (d) => /^(508|652|827|826|6049|3535)/.test(d),
    lengths: [16],
    cvvLength: 3,
  },
]

export function detectCardBrand(number: string): CardBrand | null {
  const digits = number.replace(/\D/g, '')
  if (!digits) return null
  return CARD_BRANDS.find((brand) => brand.test(digits)) ?? null
}

/** Splits a card number into the groups the printed card uses. */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19)
  const brand = detectCardBrand(digits)
  if (brand?.id === 'amex') {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(' ')
  }
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function isExpiryValid(value: string, now = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const expiryEnd = new Date(year, month, 0, 23, 59, 59)
  return expiryEnd >= now
}
