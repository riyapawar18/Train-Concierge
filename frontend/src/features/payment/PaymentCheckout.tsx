import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { CardScreen } from './screens/CardScreen'
import { GooglePayScreen } from './screens/GooglePayScreen'
import { NetBankingScreen } from './screens/NetBankingScreen'
import { PaymentMethodsScreen } from './screens/PaymentMethodsScreen'
import { PaytmScreen } from './screens/PaytmScreen'
import { PhonePeScreen } from './screens/PhonePeScreen'
import { QrScreen } from './screens/QrScreen'
import { UpiScreen } from './screens/UpiScreen'
import { ProcessingScreen } from './ProcessingScreen'
import { PaymentSuccessScreen } from './PaymentSuccessScreen'
import { generateBankReference, generateTransactionId } from './transaction'
import type {
  MethodScreenProps,
  PaymentAuthorization,
  PaymentConfirmation,
  PaymentMethodId,
  PaymentSubject,
  PaymentTransaction,
} from './types'
import './payment.css'

const METHOD_SCREENS: Record<PaymentMethodId, ComponentType<MethodScreenProps>> = {
  googlepay: GooglePayScreen,
  phonepe: PhonePeScreen,
  paytm: PaytmScreen,
  upi: UpiScreen,
  qr: QrScreen,
  card: CardScreen,
  netbanking: NetBankingScreen,
}

type Stage = 'methods' | 'method' | 'processing' | 'success'

type AuthorizeResult =
  | { ok: true; confirmation: PaymentConfirmation }
  | { ok: false; message: string }

export interface PaymentCheckoutProps {
  open: boolean
  subject: PaymentSubject
  /**
   * Creates the booking (or stay) once the payment is authorised.
   * Resolve with the confirmation to reach the success screen; reject to send the
   * passenger back to the payment screen with the message shown as an error.
   */
  onAuthorize: (authorization: PaymentAuthorization) => Promise<PaymentConfirmation>
  /** Passenger walked away without paying. */
  onCancel: () => void
  /** Passenger acknowledged the payment receipt. */
  onClose: () => void
  /** Optional extra success-screen action, e.g. reopen the e-ticket step. */
  onContinue?: () => void
  continueLabel?: string
  dashboardPath?: string
}

/**
 * End-to-end payment: method picker → the chosen app's own interface → processing
 * animation → receipt. The booking itself is created by the host flow through
 * `onAuthorize`.
 */
function PaymentCheckout({
  open,
  subject,
  onAuthorize,
  onCancel,
  onClose,
  onContinue,
  continueLabel,
  dashboardPath = '/app/dashboard',
}: PaymentCheckoutProps) {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('methods')
  const [methodId, setMethodId] = useState<PaymentMethodId | null>(null)
  const [authorization, setAuthorization] = useState<PaymentAuthorization | null>(null)
  const [result, setResult] = useState<AuthorizeResult | null>(null)
  const [animationDone, setAnimationDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txn, setTxn] = useState<PaymentTransaction | null>(null)
  const authorizeRef = useRef(onAuthorize)

  useEffect(() => {
    authorizeRef.current = onAuthorize
  })

  useEffect(() => {
    if (!open) return
    setStage('methods')
    setMethodId(null)
    setAuthorization(null)
    setResult(null)
    setAnimationDone(false)
    setError(null)
    setTxn(null)
  }, [open])

  // Hold the processing screen until BOTH the animation and the booking call finish.
  useEffect(() => {
    if (stage !== 'processing' || !animationDone || !result || !authorization) return
    if (!result.ok) {
      setError(result.message)
      setStage('method')
      return
    }
    setTxn({
      transactionId: generateTransactionId(authorization.method),
      bankReference: generateBankReference(),
      method: authorization.method,
      methodLabel: authorization.methodLabel,
      payerReference: authorization.payerReference,
      amount: subject.amount,
      paidAt: new Date().toISOString(),
      subject,
      confirmation: result.confirmation,
    })
    setStage('success')
  }, [stage, animationDone, result, authorization, subject])

  const startPayment = (next: PaymentAuthorization) => {
    setAuthorization(next)
    setResult(null)
    setAnimationDone(false)
    setError(null)
    setStage('processing')
    authorizeRef
      .current(next)
      .then((confirmation) => setResult({ ok: true, confirmation }))
      .catch((cause: unknown) => {
        const message =
          cause instanceof Error && cause.message
            ? cause.message
            : 'The payment could not be completed. Please try again.'
        setResult({ ok: false, message })
      })
  }

  const handleDismissRequest = () => {
    if (stage === 'processing') return
    if (stage === 'success') {
      onClose()
      return
    }
    onCancel()
  }

  const MethodScreen = methodId ? METHOD_SCREENS[methodId] : null
  const screenProps: MethodScreenProps | null = MethodScreen
    ? {
        subject,
        onPay: startPayment,
        onCancel: () => {
          setStage('methods')
          setMethodId(null)
          setError(null)
        },
        error,
      }
    : null

  let body: ReactNode
  if (stage === 'processing' && authorization) {
    body = (
      <ProcessingScreen
        amount={subject.amount}
        authorization={authorization}
        onComplete={() => setAnimationDone(true)}
      />
    )
  } else if (stage === 'success' && txn) {
    body = (
      <PaymentSuccessScreen
        txn={txn}
        onContinue={onContinue}
        continueLabel={continueLabel}
        onViewDetails={
          txn.confirmation.detailsPath
            ? () => {
                navigate(txn.confirmation.detailsPath as string)
                onClose()
              }
            : undefined
        }
        onBackToDashboard={() => {
          navigate(dashboardPath)
          onClose()
        }}
      />
    )
  } else if (stage === 'method' && MethodScreen && screenProps) {
    body = <MethodScreen key={methodId ?? 'method'} {...screenProps} />
  } else {
    body = (
      <PaymentMethodsScreen
        subject={subject}
        error={error}
        onCancel={handleDismissRequest}
        onSelectMethod={(method) => {
          setMethodId(method)
          setStage('method')
          setError(null)
        }}
      />
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleDismissRequest()
      }}
    >
      <DialogContent
        showClose={false}
        className="flex max-h-[92vh] max-w-md flex-col gap-3 overflow-hidden p-5"
      >
        <DialogTitle className="sr-only">Payment for {subject.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Choose a payment method, complete its interface and confirm the payment.
        </DialogDescription>
        {body}
      </DialogContent>
    </Dialog>
  )
}

export { PaymentCheckout }
