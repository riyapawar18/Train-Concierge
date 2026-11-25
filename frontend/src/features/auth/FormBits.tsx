import { useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'

interface FormAlertProps {
  tone: 'error' | 'info'
  children: ReactNode
  testId?: string
}

export function FormAlert({ tone, children, testId }: FormAlertProps) {
  return (
    <div
      data-testid={testId}
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'error'
          ? 'rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger'
          : 'rounded-lg border border-info/30 bg-info/10 px-3.5 py-2.5 text-sm text-text'
      }
    >
      {children}
    </div>
  )
}

interface PasswordFieldProps {
  id: string
  label: string
  autoComplete: string
  registration: UseFormRegisterReturn
  description?: string
  error?: string
}

export function PasswordField({
  id,
  label,
  autoComplete,
  registration,
  description,
  error,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      description={description}
      error={error}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-navy"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      }
      {...registration}
    />
  )
}
