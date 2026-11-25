import {
  Building,
  CreditCard,
  QrCode,
  Smartphone,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { PaymentMethodId } from './types'

export interface PaymentMethodMeta {
  id: PaymentMethodId
  label: string
  tagline: string
  group: 'upi' | 'other'
  icon: LucideIcon
  /** Brand colour used for the mark; brand colours are decorative only. */
  color: string
  onColor: string
  /** Short mark rendered inside the tile when there is no logo asset. */
  mark: string
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    id: 'googlepay',
    label: 'Google Pay',
    tagline: 'UPI · saved bank accounts',
    group: 'upi',
    icon: Smartphone,
    color: '#ffffff',
    onColor: '#5f6368',
    mark: 'GPay',
  },
  {
    id: 'phonepe',
    label: 'PhonePe',
    tagline: 'UPI · wallet · PIN',
    group: 'upi',
    icon: Wallet,
    color: '#5f259f',
    onColor: '#ffffff',
    mark: 'phonepe',
  },
  {
    id: 'paytm',
    label: 'Paytm',
    tagline: 'UPI · wallet · OTP',
    group: 'upi',
    icon: Wallet,
    color: '#00b9f1',
    onColor: '#002e5b',
    mark: 'paytm',
  },
  {
    id: 'upi',
    label: 'Other UPI',
    tagline: 'Enter your UPI ID',
    group: 'upi',
    icon: Smartphone,
    color: '#f26522',
    onColor: '#ffffff',
    mark: 'UPI',
  },
  {
    id: 'qr',
    label: 'QR Code',
    tagline: 'Scan with any UPI app',
    group: 'upi',
    icon: QrCode,
    color: '#1e3a6e',
    onColor: '#ffffff',
    mark: 'QR',
  },
  {
    id: 'card',
    label: 'Debit / Credit Card',
    tagline: 'Visa, Mastercard, RuPay, Amex',
    group: 'other',
    icon: CreditCard,
    color: '#14213d',
    onColor: '#ffffff',
    mark: 'CARD',
  },
  {
    id: 'netbanking',
    label: 'Net Banking',
    tagline: 'All major Indian banks',
    group: 'other',
    icon: Building,
    color: '#0f766e',
    onColor: '#ffffff',
    mark: 'BANK',
  },
]

/** Bank handles offered in the wallet and UPI account lists. */
export interface PayerAccount {
  id: string
  bank: string
  last4: string
  vpa: string
  balance?: number
}

export const PAYER_UPI_ACCOUNTS: PayerAccount[] = [
  { id: 'hdfc', bank: 'HDFC Bank', last4: '5588', vpa: 'asha@okhdfcbank', balance: 42180 },
  { id: 'icici', bank: 'ICICI Bank', last4: '2210', vpa: 'asha@okicici', balance: 8935 },
  { id: 'sbi', bank: 'State Bank of India', last4: '7743', vpa: '9876543210@ybl', balance: 15240 },
]

export const PHONEPE_BALANCE = 6250
export const PAYTM_WALLET_BALANCE = 5480

export interface NetBanking {
  id: string
  name: string
  short: string
  color: string
  popular: boolean
}

export const NET_BANKING_CATALOG: NetBanking[] = [
  { id: 'sbi', name: 'State Bank of India', short: 'SBI', color: '#22409a', popular: true },
  { id: 'hdfc', name: 'HDFC Bank', short: 'HDFC', color: '#004c8f', popular: true },
  { id: 'icici', name: 'ICICI Bank', short: 'ICICI', color: '#f58220', popular: true },
  { id: 'axis', name: 'Axis Bank', short: 'AXIS', color: '#97144d', popular: true },
  { id: 'kotak', name: 'Kotak Mahindra Bank', short: 'KOTAK', color: '#f38b33', popular: true },
  { id: 'pnb', name: 'Punjab National Bank', short: 'PNB', color: '#0f4c81', popular: true },
  { id: 'bob', name: 'Bank of Baroda', short: 'BOB', color: '#1c57a3', popular: false },
  { id: 'canara', name: 'Canara Bank', short: 'CANARA', color: '#f37321', popular: false },
  { id: 'union', name: 'Union Bank of India', short: 'UNION', color: '#b8232f', popular: false },
  { id: 'idbi', name: 'IDBI Bank', short: 'IDBI', color: '#0a4b8d', popular: false },
  { id: 'yes', name: 'YES Bank', short: 'YES', color: '#7a2134', popular: false },
  { id: 'idfc', name: 'IDFC FIRST Bank', short: 'IDFC', color: '#0a5cb0', popular: false },
  { id: 'bos', name: 'Bank of Maharashtra', short: 'BOM', color: '#c0522e', popular: false },
  { id: 'indian', name: 'Indian Bank', short: 'INDIAN', color: '#005baa', popular: false },
  { id: 'central', name: 'Central Bank of India', short: 'CENTRAL', color: '#e4002b', popular: false },
  { id: 'cbi', name: 'Corporate Bank', short: 'CORPORATE', color: '#0096d6', popular: false },
]

/** UPI deep link for the QR screen — printed for realism, never opened. */
export function buildUpiUri(params: {
  merchantVpa: string
  merchantName: string
  amount: number
  txnNote: string
}): string {
  const query = new URLSearchParams({
    pa: params.merchantVpa,
    pn: params.merchantName,
    am: params.amount.toFixed(2),
    tn: params.txnNote,
    cu: 'INR',
  })
  return `upi://pay?${query.toString()}`
}

export const MERCHANT_VPA = 'trainconcierge@ybl'
