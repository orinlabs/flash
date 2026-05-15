import { ChevronRight, ExternalLink, Filter, RefreshCw, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { StatusDot } from '@/components/ui/status-dot'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'
import { domainFromUrl, faviconUrl } from '@/lib/format'
import type { Company, Person } from '@/api'

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) => {
      const company = p.companyId ? companyById.get(p.companyId)?.name : ''
      return [p.fullName, p.email, p.title, company]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    })
  }, [search, people, companyById])

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
        <Button variant="outline" size="md" iconLeft={Filter}>
          Filter
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
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(p) => p.id}
        loading={loading}
        hasMore={hasMore && !search}
        onLoadMore={onLoadMore}
        onRowClick={onSelectPerson}
        selectedRowKey={selectedKey}
        minWidth="980px"
        empty={{
          icon: Users,
          title: 'No people yet',
          description:
            'Start a research crawl with an ICP description and prospects will land here.',
          primaryAction: {
            label: 'New crawl',
            variant: 'primary'
          }
        }}
      />
    </section>
  )
}
