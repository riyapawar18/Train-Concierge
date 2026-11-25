import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from '@/components/StatusBadge'
import { STATUS_META } from '@/lib/status'

describe('StatusBadge', () => {
  it.each(Object.entries(STATUS_META))('renders %s consistently', (status) => {
    const { container } = render(<StatusBadge status={status} />)

    expect(screen.getByText(STATUS_META[status as keyof typeof STATUS_META].label)).toBeVisible()
    expect(container.firstChild).toMatchSnapshot()
  })

  it('falls back to a neutral, humanized label for an unknown status', () => {
    render(<StatusBadge status="AWAITING_REVIEW" />)

    const badge = screen.getByText('Awaiting review')
    expect(badge.closest('[data-slot="badge"]')).toHaveAttribute('data-tone', 'neutral')
  })

  it('accepts a display label without changing the status tone', () => {
    render(<StatusBadge status="DELAYED" label="45 minutes late" />)

    const badge = screen.getByText('45 minutes late').closest('[data-slot="badge"]')
    expect(badge).toHaveAttribute('data-tone', 'warning')
  })
})
