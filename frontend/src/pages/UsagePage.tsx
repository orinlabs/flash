import {
  Activity,
  Building2,
  ChevronLeft,
  ChevronRight,
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
import { Input } from '@/components/ui/input'
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

const PAGE_SIZE = 8

function numberValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : 0
}

function ratio(numerator: string | number | null | undefined, denominator: number): number {
  if (denominator <= 0) return 0
  return numberValue(numerator) / denominator
}

function normalize(value: string | number | null | undefined): string {
  return String(value ?? '').toLowerCase()
}

function matchesQuery(query: string, values: Array<string | number | null | undefined>) {
  if (!query) return true
  return values.some((value) => normalize(value).includes(query))
}

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
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const qs = range.days != null ? '?days=' + range.days : ''
    const recentQs = range.days != null ? '?limit=50&days=' + range.days : '?limit=50'
    try {
      const [s, c, r, co, p, rec] = await Promise.all([
        apiGet<UsageSummaryResponse>('/usage/summary' + qs),
        apiGet<{ data: UsageByCampaignRow[] }>('/usage/by-campaign' + qs),
        apiGet<{ data: UsageByRunRow[] }>('/usage/by-run' + qs),
        apiGet<{ data: UsageByCompanyRow[] }>('/usage/by-company' + qs),
        apiGet<{ data: UsageByPersonRow[] }>('/usage/by-person' + qs),
        apiGet<{ data: UsageEvent[] }>('/usage/recent' + recentQs)
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
    const id = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(id)
  }, [load])

  const crawlById = useMemo(
    () => new Map(crawls.map((c) => [c.id, c])),
    [crawls]
  )

  const overall = summary?.overall
  const searchQuery = search.trim().toLowerCase()

  const filteredCampaigns = useMemo(
    () =>
      byCampaign.filter((r) =>
        matchesQuery(searchQuery, [r.campaignName, r.campaignStatus, r.campaignId])
      ),
    [byCampaign, searchQuery]
  )

  const filteredRuns = useMemo(
    () =>
      byRun.filter((r) =>
        matchesQuery(searchQuery, [
          r.campaignName,
          r.runStatus,
          r.campaignId,
          r.campaignRunId
        ])
      ),
    [byRun, searchQuery]
  )

  const filteredCompanies = useMemo(
    () =>
      byCompany.filter((r) =>
        matchesQuery(searchQuery, [r.companyName, r.companyDomain, r.companyId])
      ),
    [byCompany, searchQuery]
  )

  const filteredPeople = useMemo(
    () =>
      byPerson.filter((r) =>
        matchesQuery(searchQuery, [
          r.personName,
          r.personTitle,
          r.companyName,
          r.companyId,
          r.personId
        ])
      ),
    [byPerson, searchQuery]
  )

  const filteredRecent = useMemo(
    () =>
      recent.filter((e) =>
        matchesQuery(searchQuery, [
          e.provider,
          e.operation,
          e.model,
          e.campaignName,
          e.personName,
          e.companyName,
          e.campaignId,
          e.companyId,
          e.personId
        ])
      ),
    [recent, searchQuery]
  )

  const totalRows =
    byCampaign.length + byRun.length + byCompany.length + byPerson.length + recent.length
  const filteredRows =
    filteredCampaigns.length +
    filteredRuns.length +
    filteredCompanies.length +
    filteredPeople.length +
    filteredRecent.length

  const totalCost = numberValue(overall?.costUsd)
  const qualifiedCount = byRun.reduce((sum, r) => sum + (r.qualifiedCount ?? 0), 0)
  const personCount = byPerson.filter((r) => r.personId).length
  const unattributedCampaignCost = byCampaign
    .filter((r) => !r.campaignId)
    .reduce((sum, r) => sum + numberValue(r.costUsd), 0)
  const topCampaign = byCampaign.reduce<UsageByCampaignRow | null>(
    (top, row) => (!top || numberValue(row.costUsd) > numberValue(top.costUsd) ? row : top),
    null
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg">
      <Toolbar>
        <Input
          iconLeft={Search}
          placeholder="Search usage..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[280px]"
        />
        <span className="hidden text-xs text-ink-faint sm:inline">
          {searchQuery
            ? filteredRows.toLocaleString() + ' of ' + totalRows.toLocaleString() + ' rows'
            : totalRows.toLocaleString() + ' rows'}
        </span>
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
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
            sub={overall ? overall.events.toLocaleString() + ' events' : '-'}
            loading={loading && !summary}
          />
          <Stat
            icon={Activity}
            label="Avg cost / event"
            value={formatUsd(ratio(overall?.costUsd, overall?.events ?? 0))}
            sub={overall ? (overall.events || 0).toLocaleString() + ' billable events' : '-'}
            loading={loading && !summary}
          />
          <Stat
            icon={Sparkles}
            label="Cost / qualified"
            value={formatUsd(ratio(overall?.costUsd, qualifiedCount))}
            sub={qualifiedCount.toLocaleString() + ' qualified people'}
            loading={loading && !summary}
          />
          <Stat
            icon={Users}
            label="Cost / person"
            value={formatUsd(ratio(overall?.costUsd, personCount))}
            sub={personCount.toLocaleString() + ' attributed people'}
            loading={loading && !summary}
          />
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Stat
            icon={Gauge}
            label="Token mix"
            value={formatTokens(overall?.totalTokens)}
            sub={
              overall
                ? formatTokens(overall.promptTokens) +
                  ' prompt / ' +
                  formatTokens(overall.completionTokens) +
                  ' completion'
                : '-'
            }
            loading={loading && !summary}
          />
          <Stat
            icon={Gauge}
            label="Unattributed spend"
            value={formatUsd(unattributedCampaignCost)}
            sub={
              totalCost > 0
                ? ((unattributedCampaignCost / totalCost) * 100).toFixed(0) +
                  '% of total spend'
                : '0% of total spend'
            }
            loading={loading && !summary}
          />
          <Stat
            icon={Search}
            label="Top crawl"
            value={formatUsd(topCampaign?.costUsd)}
            sub={topCampaign?.campaignName ?? 'No crawl spend yet'}
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
          rows={filteredCampaigns}
          totalRows={byCampaign.length}
          crawlById={crawlById}
          onSelectCrawl={onSelectCrawl}
          loading={loading && byCampaign.length === 0}
        />

        <RunsTable
          rows={filteredRuns}
          totalRows={byRun.length}
          crawlById={crawlById}
          onSelectCrawl={onSelectCrawl}
          loading={loading && byRun.length === 0}
        />

        <CompaniesTable
          rows={filteredCompanies}
          totalRows={byCompany.length}
          companyById={companyById}
          onSelectCompany={onSelectCompany}
          loading={loading && byCompany.length === 0}
        />

        <PeopleTable
          rows={filteredPeople}
          totalRows={byPerson.length}
          personById={personById}
          companyById={companyById}
          onSelectPerson={onSelectPerson}
          onSelectCompany={onSelectCompany}
          loading={loading && byPerson.length === 0}
        />

        <RecentEventsCard
          events={filteredRecent}
          totalEvents={recent.length}
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
  totalRows,
  crawlById,
  onSelectCrawl,
  loading
}: {
  rows: UsageByCampaignRow[]
  totalRows: number
  crawlById: Map<string, Campaign>
  onSelectCrawl: (crawl: Campaign) => void
  loading: boolean
}) {
  const page = usePagination(rows.length)
  const pageRows = page.slice(rows)
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-ink-faint" />
            <CardTitle>By crawl</CardTitle>
          </div>
          <TableCount visible={rows.length} total={totalRows} />
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
            <Th align="right">Avg event</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {pageRows.map((r) => {
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
              <Td align="right" mono>
                {formatUsd(ratio(r.costUsd, r.events))}
              </Td>
              <Td align="right" mono strong>
                {formatUsd(r.costUsd)}
              </Td>
            </tr>
          )
        })}
      </SimpleTable>
      <PaginationFooter {...page} totalRows={rows.length} />
    </Card>
  )
}

function RunsTable({
  rows,
  totalRows,
  crawlById,
  onSelectCrawl,
  loading
}: {
  rows: UsageByRunRow[]
  totalRows: number
  crawlById: Map<string, Campaign>
  onSelectCrawl: (crawl: Campaign) => void
  loading: boolean
}) {
  const page = usePagination(rows.length)
  const pageRows = page.slice(rows)
  if (rows.length === 0 && !loading) return null
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="size-3.5 text-ink-faint" />
            <CardTitle>By crawl run</CardTitle>
          </div>
          <TableCount visible={rows.length} total={totalRows} />
        </div>
      </CardHeader>
      <SimpleTable
        loading={loading}
        empty="No run spend recorded yet."
        columnCount={7}
        head={
          <tr>
            <Th>Crawl</Th>
            <Th>Run</Th>
            <Th>When</Th>
            <Th align="right">Qualified</Th>
            <Th align="right">Tokens</Th>
            <Th align="right">Cost / qual.</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {pageRows.map((r) => {
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
              <Td align="right" mono>
                {formatUsd(ratio(r.costUsd, r.qualifiedCount ?? 0))}
              </Td>
              <Td align="right" mono strong>
                {formatUsd(r.costUsd)}
              </Td>
            </tr>
          )
        })}
      </SimpleTable>
      <PaginationFooter {...page} totalRows={rows.length} />
    </Card>
  )
}

function CompaniesTable({
  rows,
  totalRows,
  companyById,
  onSelectCompany,
  loading
}: {
  rows: UsageByCompanyRow[]
  totalRows: number
  companyById: Map<string, Company>
  onSelectCompany: (id: string) => void
  loading: boolean
}) {
  const page = usePagination(rows.length)
  const pageRows = page.slice(rows)
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-3.5 text-ink-faint" />
            <CardTitle>By account</CardTitle>
          </div>
          <TableCount visible={rows.length} total={totalRows} />
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
            <Th align="right">Avg event</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {pageRows.map((r) => {
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
              <Td align="right" mono>
                {formatUsd(ratio(r.costUsd, r.events))}
              </Td>
              <Td align="right" mono strong>
                {formatUsd(r.costUsd)}
              </Td>
            </tr>
          )
        })}
      </SimpleTable>
      <PaginationFooter {...page} totalRows={rows.length} />
    </Card>
  )
}

function PeopleTable({
  rows,
  totalRows,
  personById,
  companyById,
  onSelectPerson,
  onSelectCompany,
  loading
}: {
  rows: UsageByPersonRow[]
  totalRows: number
  personById: Map<string, Person>
  companyById: Map<string, Company>
  onSelectPerson: (person: Person) => void
  onSelectCompany: (id: string) => void
  loading: boolean
}) {
  const page = usePagination(rows.length)
  const pageRows = page.slice(rows)
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="size-3.5 text-ink-faint" />
            <CardTitle>By person</CardTitle>
          </div>
          <TableCount visible={rows.length} total={totalRows} />
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
            <Th align="right">Avg event</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {pageRows.map((r) => {
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
              <Td align="right" mono>
                {formatUsd(ratio(r.costUsd, r.events))}
              </Td>
              <Td align="right" mono strong>
                {formatUsd(r.costUsd)}
              </Td>
            </tr>
          )
        })}
      </SimpleTable>
      <PaginationFooter {...page} totalRows={rows.length} />
    </Card>
  )
}

function RecentEventsCard({
  events,
  totalEvents,
  onSelectCrawl,
  onSelectCompany,
  onSelectPerson,
  loading
}: {
  events: UsageEvent[]
  totalEvents: number
  onSelectCrawl: (id: string) => void
  onSelectCompany: (id: string) => void
  onSelectPerson: (id: string) => void
  loading: boolean
}) {
  const page = usePagination(events.length)
  const pageRows = page.slice(events)
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="size-3.5 text-ink-faint" />
            <CardTitle>Recent events</CardTitle>
          </div>
          <TableCount visible={events.length} total={totalEvents} />
        </div>
      </CardHeader>
      <SimpleTable
        loading={loading}
        empty="No usage events yet. Run a crawl to see calls land here."
        columnCount={7}
        head={
          <tr>
            <Th>When</Th>
            <Th>Provider</Th>
            <Th>Model</Th>
            <Th>Crawl</Th>
            <Th>Subject</Th>
            <Th align="right">Tokens</Th>
            <Th align="right">Cost</Th>
          </tr>
        }
      >
        {pageRows.map((e) => (
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
            <Td mono>
              {e.model ?? <span className="text-ink-faint">-</span>}
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
      <PaginationFooter {...page} totalRows={events.length} />
    </Card>
  )
}

function usePagination(rowCount: number) {
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

function TableCount({ visible, total }: { visible: number; total: number }) {
  return (
    <span className="shrink-0 font-mono text-[11px] tabular text-ink-faint">
      {visible === total
        ? total.toLocaleString()
        : visible.toLocaleString() + ' of ' + total.toLocaleString()}
    </span>
  )
}

function PaginationFooter({
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

function SimpleTable({
  head,
  children,
  loading,
  empty,
  columnCount = 6
}: {
  head: React.ReactNode
  children: React.ReactNode
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
