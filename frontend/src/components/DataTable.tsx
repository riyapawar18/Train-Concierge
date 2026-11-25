import type { ReactNode } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  className?: string
}

interface DataTableProps<T> {
  caption: string
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  emptyDescription: string
  className?: string
}

function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyDescription,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState description={emptyDescription} className={className} />
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-surface shadow-card',
        className,
      )}
    >
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-surface-muted/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    'h-11 px-4 text-xs font-semibold tracking-wide text-muted uppercase',
                    column.align === 'right' && 'text-right',
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-b border-border last:border-0 hover:bg-surface-muted/40"
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'px-4 py-3 align-middle text-text',
                      column.align === 'right' && 'text-right',
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border sm:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)} className="p-4">
            <dl className="flex flex-col gap-2">
              {columns.map((column) => (
                <div key={column.id} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs font-semibold tracking-wide text-muted uppercase">
                    {column.header}
                  </dt>
                  <dd className="min-w-0 text-right text-sm break-words text-text">
                    {column.cell(row)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { DataTable, type DataTableProps }
