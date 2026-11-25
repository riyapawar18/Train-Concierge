import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

interface PlaceholderPageProps {
  title: string
  description: string
  emptyDescription: string
  icon?: LucideIcon
  actions?: ReactNode
}

function PlaceholderPage({
  title,
  description,
  emptyDescription,
  icon,
  actions,
}: PlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} actions={actions} />
      <EmptyState description={emptyDescription} icon={icon} />
    </div>
  )
}

export { PlaceholderPage, type PlaceholderPageProps }
