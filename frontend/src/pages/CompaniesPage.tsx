import { Building2, ChevronRight, Filter, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'
import { faviconUrl } from '@/lib/format'
import type { Company, Person } from '@/api'

interface Props {
  companies: Company[]
  people: Person[]
  loading: boolean
  hasMore: boolean
  onRefresh: () => void
  onLoadMore: () => void
  onSelectCompany: (company: Company) => void
  selectedKey: string | null
}

export function CompaniesPage({
  companies,
  people,
  loading,
  hasMore,
  onRefresh,
  onLoadMore,
  onSelectCompany,
  selectedKey
}: Props) {
  const [search, setSearch] = useState('')

  const peopleByCompany = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of people) {
      if (!p.companyId) continue
      map.set(p.companyId, (map.get(p.companyId) ?? 0) + 1)
    }
    return map
  }, [people])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) =>
      [c.name, c.domain, c.industry, c.hqLocation]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    )
  }, [search, companies])

  const columns: DataTableColumn<Company>[] = [
    {
      id: 'name',
      header: 'Company',
      width: '28%',
      cell: (c) => {
        const fav = faviconUrl(c.domain ?? c.website)
        return (
          <div className="flex items-center gap-2.5">
            {fav ? (
              <img
                src={fav}
                alt=""
                className="size-5 rounded-sm border border-line"
                onError={(e) => ((e.currentTarget.style.visibility = 'hidden'))}
              />
            ) : (
              <span className="size-5 rounded-sm border border-line bg-surface-muted" />
            )}
            <span className="truncate font-medium text-ink">{c.name}</span>
          </div>
        )
      }
    },
    {
      id: 'domain',
      header: 'Domain',
      width: '22%',
      cell: (c) =>
        c.website || c.domain ? (
          <a
            href={c.website ?? `https://${c.domain}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[12px] text-ink-muted underline-offset-4 hover:text-accent hover:underline"
          >
            {c.domain ?? c.website}
          </a>
        ) : (
          <span className="text-ink-faint">-</span>
        )
    },
    {
      id: 'industry',
      header: 'Industry',
      width: '18%',
      cell: (c) =>
        c.industry ? (
          <span className="truncate text-ink-muted">{c.industry}</span>
        ) : (
          <span className="text-ink-faint">-</span>
        )
    },
    {
      id: 'hq',
      header: 'HQ',
      width: '18%',
      cell: (c) =>
        c.hqLocation ? (
          <span className="truncate text-ink-muted">{c.hqLocation}</span>
        ) : (
          <span className="text-ink-faint">-</span>
        )
    },
    {
      id: 'people',
      header: 'People',
      align: 'right',
      width: '90px',
      cell: (c) => {
        const count = peopleByCompany.get(c.id) ?? 0
        return (
          <span className="font-mono tabular text-[12.5px] text-ink-muted">{count}</span>
        )
      }
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
          placeholder="Search companies..."
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
          loading={loading && companies.length > 0}
        >
          {!(loading && companies.length > 0) ? <RefreshCw /> : null}
        </Button>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        loading={loading}
        hasMore={hasMore && !search}
        onLoadMore={onLoadMore}
        onRowClick={onSelectCompany}
        selectedRowKey={selectedKey}
        minWidth="900px"
        empty={{
          icon: Building2,
          title: 'No companies yet',
          description:
            'Companies appear automatically as the crawler discovers prospects matching your ICP.'
        }}
      />
    </section>
  )
}
