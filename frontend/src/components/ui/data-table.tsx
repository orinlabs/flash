import * as React from 'react'
import { Loader2 } from 'lucide-react'

import { EmptyState, type EmptyStateProps } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type DataTableColumn<TRow> = {
  id: string
  header: React.ReactNode
  cell: (row: TRow) => React.ReactNode
  className?: string
  headerClassName?: string
  width?: string
  align?: 'left' | 'right' | 'center'
}

export interface DataTableProps<TRow> {
  columns: DataTableColumn<TRow>[]
  rows: TRow[]
  rowKey: (row: TRow) => string
  loading?: boolean
  hasMore?: boolean
  onRowClick?: (row: TRow) => void
  onLoadMore?: () => void
  empty: EmptyStateProps
  minWidth?: number | string
  selectedRowKey?: string | null
}

export function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  loading,
  hasMore,
  onRowClick,
  onLoadMore,
  empty,
  minWidth,
  selectedRowKey
}: DataTableProps<TRow>) {
  const showSkeleton = loading && rows.length === 0
  const showEmpty = !loading && rows.length === 0

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    if (!onLoadMore || !hasMore || loading) return
    const t = event.currentTarget
    const distanceFromBottom = t.scrollHeight - t.scrollTop - t.clientHeight
    if (distanceFromBottom < 240) onLoadMore()
  }

  const colCount = columns.length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto" onScroll={handleScroll}>
        <Table style={minWidth ? { minWidth } : undefined}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead
                  key={c.id}
                  style={{ width: c.width }}
                  className={cn(
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    c.headerClassName
                  )}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={'sk-' + i} className="hover:bg-transparent">
                    {columns.map((c) => (
                      <TableCell key={c.id}>
                        <Skeleton className="h-3.5 w-[60%]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
            {showEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="h-auto">
                  <EmptyState compact {...empty} />
                </TableCell>
              </TableRow>
            ) : null}
            {!showSkeleton && !showEmpty
              ? rows.map((row) => {
                  const key = rowKey(row)
                  const selected = selectedRowKey === key
                  return (
                    <TableRow
                      key={key}
                      data-state={selected ? 'selected' : undefined}
                      className={cn(onRowClick && 'cursor-pointer')}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((c) => (
                        <TableCell
                          key={c.id}
                          className={cn(
                            c.align === 'right' && 'text-right',
                            c.align === 'center' && 'text-center',
                            c.className
                          )}
                        >
                          {c.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              : null}
          </TableBody>
        </Table>
      </div>
      <div className="flex h-9 shrink-0 items-center justify-between border-t border-line bg-surface px-4 text-xs text-ink-muted">
        <span>
          {showSkeleton
            ? 'Loading...'
            : showEmpty
              ? '0 results'
              : `Showing ${rows.length}${hasMore ? '+' : ''}`}
        </span>
        <span className="inline-flex items-center gap-2">
          {loading && rows.length > 0 ? (
            <>
              <Loader2 className="size-3 animate-spin" /> Loading more
            </>
          ) : !loading && hasMore ? (
            'Scroll for more'
          ) : !showEmpty ? (
            'End of results'
          ) : null}
        </span>
      </div>
    </div>
  )
}
