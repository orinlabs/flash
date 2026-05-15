import { Activity, DollarSign, Gauge, RefreshCw, Search, Sparkles, Users } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'
import { formatTokens, formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'

import { ModelBreakdown, ProviderBreakdown, Stat } from '@/features/usage/UsageSummary'
import { CompaniesTable, CrawlsTable, PeopleTable, RecentEventsCard, RunsTable } from '@/features/usage/UsageTables'
import { RANGES, matchesQuery, numberValue, ratio } from '@/features/usage/usage-utils'

interface Props {
  crawls: Campaign[]
  companyById: Map<string, Company>
  personById: Map<string, Person>
  onSelectCrawl: (crawl: Campaign) => void
  onSelectCompany: (companyId: string) => void
  onSelectPerson: (person: Person) => void
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
