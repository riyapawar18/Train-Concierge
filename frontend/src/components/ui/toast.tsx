import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Toast as ToastPrimitive } from 'radix-ui'
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'info' | 'success' | 'danger'

interface ToastInput {
  title: string
  description?: string
  tone?: ToastTone
}

interface ToastItem extends ToastInput {
  id: number
}

interface ToastContextValue {
  toast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneIcon = {
  info: Info,
  success: CircleCheck,
  danger: TriangleAlert,
} satisfies Record<ToastTone, typeof Info>

const toneClasses: Record<ToastTone, string> = {
  info: 'text-info',
  success: 'text-success',
  danger: 'text-danger',
}

let toastCounter = 0

function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((input: ToastInput) => {
    toastCounter += 1
    setItems((current) => [...current, { ...input, id: toastCounter }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider duration={5000} swipeDirection="right">
        {children}
        {items.map((item) => {
          const tone = item.tone ?? 'info'
          const Icon = toneIcon[tone]
          return (
            <ToastPrimitive.Root
              key={item.id}
              onOpenChange={(open) => {
                if (!open) dismiss(item.id)
              }}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-card data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right"
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0', toneClasses[tone])} aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <ToastPrimitive.Title className="text-sm font-semibold text-text">
                  {item.title}
                </ToastPrimitive.Title>
                {item.description ? (
                  <ToastPrimitive.Description className="text-sm text-muted">
                    {item.description}
                  </ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close
                aria-label="Dismiss notification"
                className="grid size-6 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
              >
                <X className="size-4" aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          )
        })}
        <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}

function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export { ToastProvider, useToast, type ToastInput, type ToastTone }
