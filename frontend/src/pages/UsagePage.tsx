import {
  Activity,
  Building2,
  DollarSign,
  Gauge,
  Globe,
  RefreshCw,
  Search,
  Sparkles,
  Users
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  apiGet,
  type Campaign,
  type Company,
  type Person,
  type UsageByCampaignRow,
  type UsageByCompanyRow,
  type UsageByPersonRow,
  type UsageByRunRow,
  type UsageEvent,
  type UsageSummaryResponse
} from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-dot'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'
import { faviconUrl, formatRelative, formatTokens, formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  crawls: Campaign[]
  companyById: Map<string, Company>
  personById: Map<string, Person>
  onSelectCrawl: (crawl: Campaign) => void
  onSelectCompany: (companyId: string) => void
  onSelectPerson: (person: Person) => void
}

type RangeOption = { id: string; label: string; days: number | null }

const RANGES: RangeOption[] = [
  { id: '24h', label: '24h', days: 1 },
  { id: '7d', label: '7d', days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: 'all', label: 'All time', days: null }
]

export function UsagePage({
  crawls,
  companyById,
  personById,
  onSelectCrawl,
  onSelectCompany,
  onSelectPerson
}: Props) {
  const [rangeId, setRangeId] = useState<string>('all')
  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[3]

  const [summary, setSummary] = useState<UsageSummaryResponse | null>(null)
  const [byCampaign, setByCampaign] = useState<UsageByCampaignRow[]>([])
  const [byRun, setByRun] = useState<UsageByRunRow[]>([])
  const [byCompany, setByCompany] = useState<UsageByCompanyRow[]>([])
  const [byPerson, setByPerson] = useState<UsageByPersonRow[]>([])
  const [recent, setRecent] = useState<UsageEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const qs = range.days != null ? `?days=${range.days}` : ''
    try {
      const [s, c, r, co, p, rec] = await Promise.all([
        apiGet<UsageSummaryResponse>('/usage/summary' + qs),
        apiGet<{ data: UsageByCampaignRow[] }>('/usage/by-campaign' + qs),
        apiGet<{ data: UsageByRunRow[] }>('/usage/by-run' + qs),
        apiGet<{ data: UsageByCompanyRow[] }>('/usage/by-company' + qs),
        apiGet<{ data: UsageByPersonRow[] }>('/usage/by-person' + qs),
        apiGet<{ data: UsageEvent[] }>('/usage/recent?limit=50')
      ])
      setSummary(s)
      setByCampaign(c.data)
      setByRun(r.data)
      setByCompany(co.data)
      setByPerson(p.data)
      setRecent(rec.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage')
    } finally {
      setLoading(false)
    }
  }, [range.days])

  useEffect(() => {
    void load()
  }, [load])

  const crawlById = useMemo(
    () => new Map(crawls.map((c) => [c.id, c])),
    [crawls]
  )

  const overall = summary?.overall

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Toolbar>
          <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRangeId(r.id)}
                className={cn(
                  'h-6 rounded px-2 text-xs transition-colors',
                  r.id === rangeId
                    ? 'bg-surface-muted text-ink ring-1 ring-line'
                    : 'text-ink-muted hover:text-ink'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <ToolbarSpacer />
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh"
            onClick={() => void load()}
            loading={loading && summary !== null}
          >
            {!(loading && summary !== null) ? <RefreshCw /> : null}
          </Button>
        </Toolbar>

        {error ? (
          <Card>
            <CardContent>
              <p className="text-sm text-bad">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            icon={DollarSign}
            label="Total spend"
            value={formatUsd(overall?.costUsd)}
            sub={overall ? `${overall.events.toLocaleString()} events` : '-'}
            loading={loading && !summary}
          />
          <Stat
            icon={Gauge}
            label="Total tokens"
            value={formatTokens(overall?.totalTokens)}
            sub={
              overall
                ? `${formatTokens(overall.promptTokens)} in / ${formatTokens(overall.completionTokens)} out`
                : '-'
            }
            loading={loading && !summary}
          />
          <Stat
            icon={Search}
            label="Crawls billed"
            value={String(byCampaign.filter((r) => r.campaignId).length)}
            sub={`${byRun.filter((r) => r.campaignRunId).length} runs`}
            loading={loading && !summary}
          />
          <Stat
            icon={Users}
            label="People billed"
            value={String(byPerson.filter((r) => r.personId).length)}
            sub={`${byCompany.filter((r) => r.companyId).length} accounts`}
            loading={loading && !summary}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ProviderBreakdown
            rows={summary?.byProvider ?? []}
            totalCost={Number(overall?.costUsd ?? 0)}
            loading={loading && !summary}
          />
          <ModelBreakdown
            rows={summary?.byModel ?? []}
            loading={loading && !summary}
          />
        </section>

        <CrawlsTable
          rows={byCampaign}
          crawlById={crawlById}
          onSelectCrawl={onSelectCrawl}
          loading={loading && byCampaign.length === 0}
        />

        <RunsTable
          rows={byRun}
          crawlById={crawlById}
          onSelectCrawl={onSelectCrawl}
          loading={loading && byRun.length === 0}
        />

        <CompaniesTable
          rows={byCompany}
          companyById={companyById}
          onSelectCompany={onSelectCompany}
          loading={loading && byCompany.length === 0}
        />

        <PeopleTable
          rows={byPerson}
          personById={personById}
          companyById={companyById}
          onSelectPerson={onSelectPerson}
          onSelectCompany={onSelectCompany}
          loading={loading && byPerson.length === 0}
        />

        <RecentEventsCard
          events={recent}
          onSelectCrawl={(id) => {
            const crawl = crawlById.get(id)
            if (crawl) onSelectCrawl(crawl)
          }}
          onSelectCompany={onSelectCompany}
          onSelectPerson={(id) => {
            const person = personById.get(id)
            if (person) onSelectPerson(person)
          }}
          loading={loading && recent.length === 0}
        />
      </div>
    </div>
  )
}

function Stat({
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

function ProviderBreakdown({
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
                        style={{ width: `${Math.min(100, pct).toFixed(2)}%` }}
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

function ModelBreakdown({
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

function CrawlsTable({
  rows,
  crawlById,
  onSelectCrawl,
  loading
}: {
  rows: UsageByCampaignRow[]
  crawlById: Map<string, Campaign>
  onSelectCrawl: (crawl: Campaign) => void
  loading: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-ink-faint" />
          <CardTitle>By crawl</CardTitle>
        </div>
      </CardHeader>
      <SimpleTable
        loading={loading}
        empty="No crawl spend recorded yet."
        head={
          <tr>
            <Th>Crawl</Th>
            <Th>Status</Th>
            <Th align="right">Events</Th>
            <Th align="right">Tokens</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {rows.map((r) => {
          const crawl = r.campaignId ? crawlById.get(r.campaignId) : null
          return (
            <tr
              key={r.campaignId ?? 'unattributed'}
              className={cn(
                crawl && 'cursor-pointer',
                'border-b border-line transition-colors last:border-b-0 hover:bg-surface-muted/40'
              )}
              onClick={() => crawl && onSelectCrawl(crawl)}
            >
              <Td>
                <span className="truncate text-sm text-ink">
                  {r.campaignName ?? (
                    <span className="text-ink-faint">Unattributed</span>
                  )}
                </span>
              </Td>
              <Td>
                {r.campaignStatus ? (
                  <StatusDot status={r.campaignStatus} />
                ) : (
                  <span className="text-ink-faint">-</span>
                )}
              </Td>
              <Td align="right" mono>
                {r.events.toLocaleString()}
              </Td>
              <Td align="right" mono>
                {formatTokens(r.totalTokens)}
              </Td>
              <Td align="right" mono strong>
                {formatUsd(r.costUsd)}
              </Td>
            </tr>
          )
        })}
      </SimpleTable>
    </Card>
  )
}

function RunsTable({
  rows,
  crawlById,
  onSelectCrawl,
  loading
}: {
  rows: UsageByRunRow[]
  crawlById: Map<string, Campaign>
  onSelectCrawl: (crawl: Campaign) => void
  loading: boolean
}) {
  if (rows.length === 0 && !loading) return null
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="size-3.5 text-ink-faint" />
          <CardTitle>By crawl run</CardTitle>
        </div>
      </CardHeader>
      <SimpleTable
        loading={loading}
        empty="No run spend recorded yet."
        head={
          <tr>
            <Th>Crawl</Th>
            <Th>Run</Th>
            <Th>When</Th>
            <Th align="right">Qualified</Th>
            <Th align="right">Tokens</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {rows.map((r) => {
          const crawl = r.campaignId ? crawlById.get(r.campaignId) : null
          return (
            <tr
              key={(r.campaignRunId ?? '?') + (r.campaignId ?? '')}
              className={cn(
                crawl && 'cursor-pointer',
                'border-b border-line transition-colors last:border-b-0 hover:bg-surface-muted/40'
              )}
              onClick={() => crawl && onSelectCrawl(crawl)}
            >
              <Td>
                <span className="truncate text-sm text-ink">
                  {r.campaignName ?? (
                    <span className="text-ink-faint">Unattributed</span>
                  )}
                </span>
              </Td>
              <Td>
                {r.runStatus ? (
                  <StatusDot status={r.runStatus} />
                ) : (
                  <span className="text-ink-faint">-</span>
                )}
              </Td>
              <Td>
                <span className="text-xs text-ink-muted">
                  {formatRelative(r.runCreatedAt) ?? '-'}
                </span>
              </Td>
              <Td align="right" mono>
                {r.qualifiedCount ?? 0}
              </Td>
              <Td align="right" mono>
                {formatTokens(r.totalTokens)}
              </Td>
              <Td align="right" mono strong>
                {formatUsd(r.costUsd)}
              </Td>
            </tr>
          )
        })}
      </SimpleTable>
    </Card>
  )
}

function CompaniesTable({
  rows,
  companyById,
  onSelectCompany,
  loading
}: {
  rows: UsageByCompanyRow[]
  companyById: Map<string, Company>
  onSelectCompany: (id: string) => void
  loading: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="size-3.5 text-ink-faint" />
          <CardTitle>By account</CardTitle>
        </div>
      </CardHeader>
      <SimpleTable
        loading={loading}
        empty="No account spend recorded yet."
        head={
          <tr>
            <Th>Company</Th>
            <Th>Domain</Th>
            <Th align="right">Events</Th>
            <Th align="right">Tokens</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {rows.map((r) => {
          const company = r.companyId ? companyById.get(r.companyId) : null
          const fav = faviconUrl(r.companyDomain ?? company?.website)
          return (
            <tr
              key={r.companyId ?? 'unattributed'}
              className={cn(
                r.companyId && 'cursor-pointer',
                'border-b border-line transition-colors last:border-b-0 hover:bg-surface-muted/40'
              )}
              onClick={() => r.companyId && onSelectCompany(r.companyId)}
            >
              <Td>
                <div className="flex min-w-0 items-center gap-2">
                  {fav ? (
                    <img
                      src={fav}
                      alt=""
                      className="size-4 rounded-sm"
                      onError={(e) =>
                        ((e.currentTarget.style.visibility = 'hidden'))
                      }
                    />
                  ) : (
                    <span className="grid size-4 place-items-center rounded-sm bg-surface-muted">
                      <Globe className="size-3 text-ink-faint" />
                    </span>
                  )}
                  <span className="truncate text-sm text-ink">
                    {r.companyName ?? (
                      <span className="text-ink-faint">Unattributed</span>
                    )}
                  </span>
                </div>
              </Td>
              <Td mono>
                {r.companyDomain ?? <span className="text-ink-faint">-</span>}
              </Td>
              <Td align="right" mono>
                {r.events.toLocaleString()}
              </Td>
              <Td align="right" mono>
                {formatTokens(r.totalTokens)}
              </Td>
              <Td align="right" mono strong>
                {formatUsd(r.costUsd)}
              </Td>
            </tr>
          )
        })}
      </SimpleTable>
    </Card>
  )
}

function PeopleTable({
  rows,
  personById,
  companyById,
  onSelectPerson,
  onSelectCompany,
  loading
}: {
  rows: UsageByPersonRow[]
  personById: Map<string, Person>
  companyById: Map<string, Company>
  onSelectPerson: (person: Person) => void
  onSelectCompany: (id: string) => void
  loading: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="size-3.5 text-ink-faint" />
          <CardTitle>By person</CardTitle>
        </div>
      </CardHeader>
      <SimpleTable
        loading={loading}
        empty="No person-level spend recorded yet."
        head={
          <tr>
            <Th>Person</Th>
            <Th>Company</Th>
            <Th align="right">Events</Th>
            <Th align="right">Tokens</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {rows.map((r) => {
          const person = r.personId ? personById.get(r.personId) : null
          const company =
            r.companyId ? companyById.get(r.companyId) : null
          return (
            <tr
              key={r.personId ?? 'unattributed'}
              className={cn(
                person && 'cursor-pointer',
                'border-b border-line transition-colors last:border-b-0 hover:bg-surface-muted/40'
              )}
              onClick={() => person && onSelectPerson(person)}
            >
              <Td>
                <div className="min-w-0">
                  <div className="truncate text-sm text-ink">
                    {r.personName ?? (
                      <span className="text-ink-faint">Unattributed</span>
                    )}
                  </div>
                  {r.personTitle ? (
                    <div className="truncate text-[11px] text-ink-faint">
                      {r.personTitle}
                    </div>
                  ) : null}
                </div>
              </Td>
              <Td>
                {company ? (
                  <button
                    type="button"
                    className="text-sm text-ink-muted hover:text-accent"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectCompany(company.id)
                    }}
                  >
                    {company.name}
                  </button>
                ) : (
                  <span className="text-ink-faint">-</span>
                )}
              </Td>
              <Td align="right" mono>
                {r.events.toLocaleString()}
              </Td>
              <Td align="right" mono>
                {formatTokens(r.totalTokens)}
              </Td>
              <Td align="right" mono strong>
                {formatUsd(r.costUsd)}
              </Td>
            </tr>
          )
        })}
      </SimpleTable>
    </Card>
  )
}

function RecentEventsCard({
  events,
  onSelectCrawl,
  onSelectCompany,
  onSelectPerson,
  loading
}: {
  events: UsageEvent[]
  onSelectCrawl: (id: string) => void
  onSelectCompany: (id: string) => void
  onSelectPerson: (id: string) => void
  loading: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="size-3.5 text-ink-faint" />
          <CardTitle>Recent events</CardTitle>
        </div>
      </CardHeader>
      <SimpleTable
        loading={loading}
        empty="No usage events yet. Run a crawl to see calls land here."
        head={
          <tr>
            <Th>When</Th>
            <Th>Provider</Th>
            <Th>Crawl</Th>
            <Th>Subject</Th>
            <Th align="right">Tokens</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {events.map((e) => (
          <tr key={e.id} className="border-b border-line last:border-b-0">
            <Td>
              <span className="text-xs text-ink-muted">
                {formatRelative(e.createdAt) ?? '-'}
              </span>
            </Td>
            <Td>
              <div className="flex items-center gap-1.5">
                <Badge variant="mono">{e.provider}</Badge>
                <span className="text-[11px] text-ink-faint">{e.operation}</span>
                {e.estimated ? (
                  <span
                    className="text-[10px] uppercase tracking-wide text-ink-faint"
                    title="Cost is an estimate"
                  >
                    est
                  </span>
                ) : null}
              </div>
            </Td>
            <Td>
              {e.campaignId && e.campaignName ? (
                <button
                  type="button"
                  className="text-xs text-ink-muted hover:text-accent"
                  onClick={() => onSelectCrawl(e.campaignId as string)}
                >
                  {e.campaignName}
                </button>
              ) : (
                <span className="text-ink-faint">-</span>
              )}
            </Td>
            <Td>
              {e.personId && e.personName ? (
                <button
                  type="button"
                  className="text-xs text-ink-muted hover:text-accent"
                  onClick={() => onSelectPerson(e.personId as string)}
                >
                  {e.personName}
                </button>
              ) : e.companyId && e.companyName ? (
                <button
                  type="button"
                  className="text-xs text-ink-muted hover:text-accent"
                  onClick={() => onSelectCompany(e.companyId as string)}
                >
                  {e.companyName}
                </button>
              ) : (
                <span className="text-ink-faint">-</span>
              )}
            </Td>
            <Td align="right" mono>
              {formatTokens(e.totalTokens)}
            </Td>
            <Td align="right" mono strong>
              {formatUsd(e.costUsd)}
            </Td>
          </tr>
        ))}
      </SimpleTable>
    </Card>
  )
}

function SimpleTable({
  head,
  children,
  loading,
  empty
}: {
  head: React.ReactNode
  children: React.ReactNode
  loading: boolean
  empty: string
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
                  <Td colSpan={6}>
                    <Skeleton className="h-4 w-full" />
                  </Td>
                </tr>
              ))
            : showEmpty
              ? (
                <tr>
                  <Td colSpan={6}>
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

function Th({
  children,
  align
}: {
  children: React.ReactNode
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

function Td({
  children,
  align,
  mono,
  strong,
  colSpan
}: {
  children: React.ReactNode
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

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center px-4 py-6 text-center text-sm text-ink-faint">
      {label}
    </div>
  )
}
