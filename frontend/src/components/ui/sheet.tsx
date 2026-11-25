import type { ComponentProps, ReactNode } from 'react'
import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui'
import { cn } from '@/lib/utils'
import { DialogOverlay } from '@/components/ui/dialog'

interface SheetContentProps extends ComponentProps<typeof DialogPrimitive.Content> {
  title: string
  description?: string
  children: ReactNode
  side?: 'left' | 'right'
}

function SheetContent({
  title,
  description,
  children,
  className,
  side = 'left',
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'fixed inset-y-0 z-50 flex h-full w-[280px] max-w-[85vw] flex-col bg-surface shadow-card data-[state=open]:animate-in data-[state=closed]:animate-out',
          side === 'left'
            ? 'left-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left'
            : 'right-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
          className,
        )}
        {...props}
      >
        <VisuallyHidden.Root asChild>
          <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
        </VisuallyHidden.Root>
        {description ? (
          <VisuallyHidden.Root asChild>
            <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
          </VisuallyHidden.Root>
        ) : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

export { Sheet, SheetTrigger, SheetClose, SheetContent, type SheetContentProps }
