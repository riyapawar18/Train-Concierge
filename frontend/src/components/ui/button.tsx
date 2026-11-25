import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent font-medium whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-[18px]',
  {
    variants: {
      variant: {
        default: 'bg-brand-navy text-white hover:bg-brand-navy-dark',
        cta: 'bg-accent-orange text-brand-navy-dark hover:bg-[#ea580c]',
        outline:
          'border-border bg-surface text-text hover:border-brand-navy/30 hover:bg-surface-muted',
        secondary: 'bg-surface-muted text-brand-navy hover:bg-[#e2e9f4]',
        ghost: 'text-text hover:bg-surface-muted',
        destructive: 'bg-danger text-white hover:bg-[#991b1b]',
        link: 'text-brand-navy underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 text-sm',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-11 px-5 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants, type ButtonProps }
