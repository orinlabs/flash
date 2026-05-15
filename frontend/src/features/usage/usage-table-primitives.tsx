import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 8

export function usePagination(rowCount: number) {
  const [pageState, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(rowCount / PAGE_SIZE))
  const page = Math.min(pageState, pageCount - 1)

  const start = page * PAGE_SIZE
  const end = Math.min(rowCount, start + PAGE_SIZE)

  return {
    page,
    pageCount,
    start,
    end,
    canPrev: page > 0,
    canNext: page < pageCount - 1,
    prev: () => setPage((current) => Math.max(0, current - 1)),
    next: () => setPage((current) => Math.min(pageCount - 1, current + 1)),
    slice: <T,>(rows: T[]) => rows.slice(start, start + PAGE_SIZE)
  }
}

export function TableCount({ visible, total }: { visible: number; total: number }) {
  return (
    <span className="shrink-0 font-mono text-[11px] tabular text-ink-faint">
      {visible === total
        ? total.toLocaleString()
        : visible.toLocaleString() + ' of ' + total.toLocaleString()}
    </span>
  )
}

export function PaginationFooter({
  page,
  pageCount,
  start,
  end,
  totalRows,
  canPrev,
  canNext,
  prev,
  next
}: ReturnType<typeof usePagination> & { totalRows: number }) {
  if (totalRows <= PAGE_SIZE) return null
  return (
    <div className="flex h-11 items-center justify-between border-t border-line bg-surface px-4">
      <span className="text-xs text-ink-muted">
        Showing {(start + 1).toLocaleString()}-{end.toLocaleString()} of{' '}
        {totalRows.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-ink-faint">
          Page {page + 1} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={prev}
          disabled={!canPrev}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={next}
          disabled={!canNext}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

export function SimpleTable({
  head,
  children,
  loading,
  empty,
  columnCount = 6
}: {
  head: ReactNode
  children: ReactNode
  loading: boolean
  empty: string
  columnCount?: number
}) {
  const childCount = Array.isArray(children) ? children.length : children ? 1 : 0
  const showEmpty = !loading && childCount === 0
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-surface-muted/40 text-2xs uppercase tracking-wide text-ink-faint">
          {head}
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-line last:border-b-0">
                  <Td colSpan={columnCount}>
                    <Skeleton className="h-4 w-full" />
                  </Td>
                </tr>
              ))
            : showEmpty
              ? (
                <tr>
                  <Td colSpan={columnCount}>
                    <EmptyHint label={empty} />
                  </Td>
                </tr>
              )
              : children}
        </tbody>
      </table>
    </div>
  )
}

export function Th({
  children,
  align
}: {
  children: ReactNode
  align?: 'right' | 'left' | 'center'
}) {
  return (
    <th
      className={cn(
        'px-4 py-2 font-medium',
        align === 'right' ? 'text-right' : 'text-left'
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  align,
  mono,
  strong,
  colSpan
}: {
  children: ReactNode
  align?: 'right' | 'left' | 'center'
  mono?: boolean
  strong?: boolean
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-4 py-2.5',
        align === 'right' ? 'text-right' : 'text-left',
        mono && 'font-mono text-[12px] tabular',
        strong && 'text-ink',
        !strong && mono && 'text-ink-muted'
      )}
    >
      {children}
    </td>
  )
}

export function EmptyHint({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center px-4 py-6 text-center text-sm text-ink-faint">
      {label}
    </div>
  )
}
