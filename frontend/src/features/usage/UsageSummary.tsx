import type { LucideIcon } from 'lucide-react'

import type { UsageSummaryResponse } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTokens, formatUsd } from '@/lib/format'

import { EmptyHint } from './usage-table-primitives'

export function Stat({
  icon: Icon,
  label,
  value,
  sub,
  loading
}: {
  icon: LucideIcon
  label: string
  value: string
  sub: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-center gap-2 text-2xs uppercase tracking-wide text-ink-faint">
          <Icon className="size-3.5" />
          {label}
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <div className="font-mono text-2xl font-semibold tabular text-ink">
            {value}
          </div>
        )}
        <div className="font-mono text-[11px] tabular text-ink-faint">{sub}</div>
      </CardContent>
    </Card>
  )
}

export function ProviderBreakdown({
  rows,
  totalCost,
  loading
}: {
  rows: UsageSummaryResponse['byProvider']
  totalCost: number
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By provider</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyHint label="No provider activity yet." />
        ) : (
          <div className="space-y-2.5">
            {rows.map((r) => {
              const cost = Number(r.costUsd)
              const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0
              return (
                <div
                  key={r.provider + r.operation}
                  className="flex items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="mono">{r.provider}</Badge>
                      <span className="text-xs text-ink-muted">{r.operation}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full bg-accent"
                        style={{ width: Math.min(100, pct).toFixed(2) + '%' }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm tabular text-ink">
                      {formatUsd(cost)}
                    </div>
                    <div className="font-mono text-[11px] tabular text-ink-faint">
                      {r.events.toLocaleString()} ev · {pct.toFixed(0)}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ModelBreakdown({
  rows,
  loading
}: {
  rows: UsageSummaryResponse['byModel']
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By model</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyHint label="No LLM calls yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-2xs uppercase tracking-wide text-ink-faint">
                <th className="py-1.5 pr-2 text-left font-medium">Model</th>
                <th className="py-1.5 px-2 text-right font-medium">Tokens</th>
                <th className="py-1.5 pl-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.model ?? '?'} className="border-b border-line last:border-b-0">
                  <td className="py-2 pr-2">
                    <span className="font-mono text-[12px] text-ink">
                      {r.model ?? '-'}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-[12px] tabular text-ink-muted">
                    {formatTokens(r.totalTokens)}
                  </td>
                  <td className="py-2 pl-2 text-right font-mono text-[12px] tabular text-ink">
                    {formatUsd(r.costUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
