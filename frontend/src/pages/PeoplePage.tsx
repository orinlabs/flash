import { ChevronRight, ExternalLink, Filter, RefreshCw, Search, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { StatusDot } from '@/components/ui/status-dot'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'
import { domainFromUrl, faviconUrl } from '@/lib/format'
import type { Company, Person } from '@/api'

const filterSelectClass =
  'h-8 rounded-md border border-line bg-surface px-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25'

function collectSearchValues(value: unknown, depth = 0): string[] {
  if (value === null || value === undefined || depth > 3) return []
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)]
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSearchValues(item, depth + 1))
  }
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => [
      key,
      ...collectSearchValues(item, depth + 1)
    ])
  }
  return []
}

function includesSearch(values: unknown[], q: string): boolean {
  return values
    .flatMap((value) => collectSearchValues(value))
    .some((value) => value.toLowerCase().includes(q))
}

interface Props {
  people: Person[]
  companyById: Map<string, Company>
  loading: boolean
  hasMore: boolean
  onRefresh: () => void
  onLoadMore: () => void
  onSelectPerson: (person: Person) => void
  onSelectCompany: (companyId: string) => void
  selectedKey: string | null
}

export function PeoplePage({
  people,
  companyById,
  loading,
  hasMore,
  onRefresh,
  onLoadMore,
  onSelectPerson,
  onSelectCompany,
  selectedKey
}: Props) {
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [companyFilter, setCompanyFilter] = useState('all')
  const [lifecycleFilter, setLifecycleFilter] = useState('all')
  const [contactFilter, setContactFilter] = useState('all')

  const companyOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: Company[] = []
    for (const person of people) {
      if (!person.companyId || seen.has(person.companyId)) continue
      const company = companyById.get(person.companyId)
      if (!company) continue
      seen.add(company.id)
      out.push(company)
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  }, [people, companyById])

  const lifecycleOptions = useMemo(() => {
    return Array.from(new Set(people.map((p) => p.lifecycleStatus).filter(Boolean))).sort()
  }, [people])

  const activeFilterCount =
    (companyFilter !== 'all' ? 1 : 0) +
    (lifecycleFilter !== 'all' ? 1 : 0) +
    (contactFilter !== 'all' ? 1 : 0)
  const hasActiveFilters = activeFilterCount > 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return people.filter((p) => {
      const company = p.companyId ? companyById.get(p.companyId) : null
      const matchesSearch =
        !q ||
        includesSearch(
          [
            p.fullName,
            p.email,
            p.phone,
            p.linkedinUrl,
            p.twitterUrl,
            p.title,
            p.seniority,
            p.department,
            p.lifecycleStatus,
            p.notes,
            p.context,
            p.icpKeywords,
            p.enrichmentSources,
            company?.name,
            company?.domain,
            company?.website,
            company?.industry,
            company?.employeeRange,
            company?.hqLocation,
            company?.outreachStatus,
            company?.outreachStrategy,
            company?.outreachEmailInstructions,
            company?.enrichmentPayload
          ],
          q
        )
      const matchesCompany =
        companyFilter === 'all' ||
        (companyFilter === 'assigned' && Boolean(p.companyId)) ||
        (companyFilter === 'unassigned' && !p.companyId) ||
        p.companyId === companyFilter
      const matchesLifecycle =
        lifecycleFilter === 'all' || p.lifecycleStatus === lifecycleFilter
      const matchesContact =
        contactFilter === 'all' ||
        (contactFilter === 'has_email' && Boolean(p.email)) ||
        (contactFilter === 'missing_email' && !p.email) ||
        (contactFilter === 'has_linkedin' && Boolean(p.linkedinUrl)) ||
        (contactFilter === 'missing_linkedin' && !p.linkedinUrl)
      return matchesSearch && matchesCompany && matchesLifecycle && matchesContact
    })
  }, [search, people, companyById, companyFilter, lifecycleFilter, contactFilter])

  function clearFilters() {
    setCompanyFilter('all')
    setLifecycleFilter('all')
    setContactFilter('all')
  }

  const empty = search || hasActiveFilters
    ? {
        icon: Filter,
        title: 'No matching people',
        description: 'Try changing the search or filters.'
      }
    : {
        icon: Users,
        title: 'No people yet',
        description:
          'Start a research crawl with an ICP description and prospects will land here.',
        primaryAction: {
          label: 'New crawl',
          variant: 'primary' as const
        }
      }

  const filterSummary =
    activeFilterCount > 0 ? 'Clear filters (' + activeFilterCount + ')' : 'Clear filters'

  const columns: DataTableColumn<Person>[] = [
    {
      id: 'name',
      header: 'Person',
      width: '24%',
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <Avatar size="md" name={p.fullName ?? '?'} />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{p.fullName ?? 'Unnamed'}</div>
            <div className="truncate text-xs text-ink-faint">{p.title ?? '-'}</div>
          </div>
        </div>
      )
    },
    {
      id: 'company',
      header: 'Company',
      width: '20%',
      cell: (p) => {
        const company = p.companyId ? companyById.get(p.companyId) : null
        if (!company) return <span className="text-ink-faint">-</span>
        const fav = faviconUrl(company.domain ?? company.website)
        return (
          <button
            type="button"
            className="group inline-flex items-center gap-2 text-sm text-ink hover:text-accent"
            onClick={(e) => {
              e.stopPropagation()
              onSelectCompany(company.id)
            }}
          >
            {fav ? (
              <img
                src={fav}
                alt=""
                className="size-4 rounded-sm"
                onError={(e) => ((e.currentTarget.style.visibility = 'hidden'))}
              />
            ) : (
              <span className="size-4 rounded-sm bg-surface-muted" />
            )}
            <span className="truncate underline-offset-4 group-hover:underline">
              {company.name}
            </span>
          </button>
        )
      }
    },
    {
      id: 'email',
      header: 'Email',
      width: '24%',
      cell: (p) =>
        p.email ? (
          <a
            href={`mailto:${p.email}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate font-mono text-[12px] text-ink-muted underline-offset-4 hover:text-accent hover:underline"
          >
            {p.email}
          </a>
        ) : (
          <span className="text-ink-faint">-</span>
        )
    },
    {
      id: 'links',
      header: 'Links',
      width: '12%',
      cell: (p) =>
        p.linkedinUrl ? (
          <a
            href={p.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-accent"
          >
            {domainFromUrl(p.linkedinUrl)?.replace('linkedin.com', 'LinkedIn') ?? 'Profile'}
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-ink-faint">-</span>
        )
    },
    {
      id: 'status',
      header: 'Status',
      width: '14%',
      cell: (p) => <StatusDot status={p.lifecycleStatus} />
    },
    {
      id: 'arrow',
      header: '',
      width: '40px',
      align: 'right',
      cell: () => (
        <ChevronRight className="size-3.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
      )
    }
  ]

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-surface">
      <Toolbar>
        <Input
          iconLeft={Search}
          placeholder="Search people..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <ToolbarSpacer />
        <Button
          variant={hasActiveFilters || filtersOpen ? 'subtle' : 'outline'}
          size="md"
          iconLeft={Filter}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          {hasActiveFilters ? 'Filters (' + activeFilterCount + ')' : 'Filters'}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh"
          onClick={onRefresh}
          loading={loading && people.length > 0}
        >
          {!(loading && people.length > 0) ? <RefreshCw /> : null}
        </Button>
      </Toolbar>
      {filtersOpen ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface-muted/35 px-4 py-2">
          <select
            aria-label="Filter people by company"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className={filterSelectClass + ' max-w-[190px]'}
          >
            <option value="all">All companies</option>
            <option value="assigned">Has company</option>
            <option value="unassigned">No company</option>
            {companyOptions.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter people by lifecycle status"
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value)}
            className={filterSelectClass}
          >
            <option value="all">All statuses</option>
            {lifecycleOptions.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter people by contact info"
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value)}
            className={filterSelectClass}
          >
            <option value="all">Any contact</option>
            <option value="has_email">Has email</option>
            <option value="missing_email">No email</option>
            <option value="has_linkedin">Has LinkedIn</option>
            <option value="missing_linkedin">No LinkedIn</option>
          </select>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" iconLeft={X} onClick={clearFilters}>
              {filterSummary}
            </Button>
          ) : null}
        </div>
      ) : null}
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => p.id}
        loading={loading}
        hasMore={hasMore && !search && !hasActiveFilters}
        onLoadMore={onLoadMore}
        onRowClick={onSelectPerson}
        selectedRowKey={selectedKey}
        minWidth="980px"
        empty={empty}
      />
    </section>
  )
}
