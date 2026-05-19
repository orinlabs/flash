import { Activity, Building2, Sparkles, Users } from 'lucide-react'

import type { Campaign, Company, Person, UsageByCampaignRow, UsageByCompanyRow, UsageByPersonRow, UsageByRunRow, UsageEvent } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusDot } from '@/components/ui/status-dot'
import { CompanyLogo } from '@/components/CompanyLogo'
import { formatRelative, formatTokens, formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'

import { PaginationFooter, SimpleTable, TableCount, Td, Th, usePagination } from './usage-table-primitives'
import { ratio } from './usage-utils'

export function CrawlsTable({
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

export function RunsTable({
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

export function CompaniesTable({
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
          const logoCompany = company ?? {
            domain: r.companyDomain,
            website: r.companyDomain ? `https://${r.companyDomain}` : null
          }
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
                  <CompanyLogo
                    company={logoCompany}
                    className="size-4 rounded-sm"
                    placeholderClassName="size-4 rounded-sm"
                  />
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

export function PeopleTable({
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

export function RecentEventsCard({
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
