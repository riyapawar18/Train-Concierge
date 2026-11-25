import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('joins class names and drops falsy values', () => {
    expect(cn('text-sm', undefined, false, 'font-medium')).toBe('text-sm font-medium')
  })

  it('resolves conflicting utilities to the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
