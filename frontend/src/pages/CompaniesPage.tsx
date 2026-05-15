import { Building2, ChevronRight, Filter, Pause, Play, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { apiPatch, apiPost, type Company, type Mailbox, type Person } from '@/api'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { StatusDot } from '@/components/ui/status-dot'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'
import { faviconUrl, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  companies: Company[]
  people: Person[]
  mailboxes: Mailbox[]
  pendingDraftsByCompany: Map<string, number>
  loading: boolean
  hasMore: boolean
  onRefresh: () => void
  onLoadMore: () => void
  onSelectCompany: (company: Company) => void
  selectedKey: string | null
  onError: (msg: string) => void
}

export function CompaniesPage({
  companies,
  people,
  mailboxes,
  pendingDraftsByCompany,
  loading,
  hasMore,
  onRefresh,
  onLoadMore,
  onSelectCompany,
  selectedKey,
  onError
}: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkMailboxId, setBulkMailboxId] = useState<string | null>(null)
  const [bulkStarting, setBulkStarting] = useState(false)
  const [bulkPausing, setBulkPausing] = useState(false)

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

  const mailboxById = useMemo(() => new Map(mailboxes.map((m) => [m.id, m])), [mailboxes])
  const activeMailboxes = useMemo(
    () => mailboxes.filter((m) => m.status === 'active'),
    [mailboxes]
  )

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible(check: boolean) {
    if (!check) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(filtered.map((c) => c.id)))
  }

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id))

  async function bulkStart() {
    if (selected.size === 0) return
    if (!bulkMailboxId) {
      onError('Pick a mailbox before starting.')
      return
    }
    setBulkStarting(true)
    try {
      await apiPost('/companies/outreach/start', {
        companyIds: Array.from(selected),
        mailboxId: bulkMailboxId
      })
      setSelected(new Set())
      onRefresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Bulk start failed')
    } finally {
      setBulkStarting(false)
    }
  }

  async function bulkSetStatus(status: 'paused' | 'completed' | 'dormant') {
    if (selected.size === 0) return
    setBulkPausing(true)
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          apiPatch('/companies/' + id + '/outreach/status', { status })
        )
      )
      setSelected(new Set())
      onRefresh()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Bulk update failed')
    } finally {
      setBulkPausing(false)
    }
  }

  const columns: DataTableColumn<Company>[] = [
    {
      id: 'select',
      header: (
        <input
          type="checkbox"
          aria-label="Select all"
          checked={allVisibleSelected}
          onChange={(e) => selectAllVisible(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="size-3.5 rounded border-line accent-accent"
        />
      ),
      width: '36px',
      cell: (c) => (
        <input
          type="checkbox"
          aria-label={'Select ' + c.name}
          checked={selected.has(c.id)}
          onChange={() => toggleSelected(c.id)}
          onClick={(e) => e.stopPropagation()}
          className="size-3.5 rounded border-line accent-accent"
        />
      )
    },
    {
      id: 'name',
      header: 'Company',
      width: '24%',
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
      id: 'outreach',
      header: 'Outreach',
      width: '140px',
      cell: (c) => <StatusDot status={c.outreachStatus} size="sm" />
    },
    {
      id: 'mailbox',
      header: 'Mailbox',
      width: '180px',
      cell: (c) => {
        if (!c.outreachMailboxId) return <span className="text-ink-faint">-</span>
        const m = mailboxById.get(c.outreachMailboxId)
        return (
          <span className="truncate font-mono text-[12px] text-ink-muted">
            {m?.email ?? '(missing)'}
          </span>
        )
      }
    },
    {
      id: 'drafts',
      header: 'Drafts',
      align: 'right',
      width: '70px',
      cell: (c) => {
        const n = pendingDraftsByCompany.get(c.id) ?? 0
        return (
          <span
            className={cn(
              'font-mono tabular text-[12.5px]',
              n > 0 ? 'text-warn' : 'text-ink-faint'
            )}
          >
            {n}
          </span>
        )
      }
    },
    {
      id: 'wake',
      header: 'Next wake',
      width: '140px',
      cell: (c) =>
        c.outreachStatus === 'working' && c.outreachNextWakeAt ? (
          <span className="truncate text-[12.5px] text-ink-muted">
            {formatRelative(c.outreachNextWakeAt) ?? '-'}
          </span>
        ) : (
          <span className="text-ink-faint">-</span>
        )
    },
    {
      id: 'domain',
      header: 'Domain',
      width: '18%',
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
      id: 'people',
      header: 'People',
      align: 'right',
      width: '70px',
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
      {selected.size > 0 ? (
        <div className="flex items-center gap-3 border-b border-line bg-accent-soft px-5 py-2">
          <span className="text-sm font-medium text-ink">
            {selected.size} selected
          </span>
          <select
            value={bulkMailboxId ?? ''}
            onChange={(e) => setBulkMailboxId(e.target.value || null)}
            className="h-8 rounded-md border border-line bg-surface px-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25"
          >
            <option value="">Pick a mailbox...</option>
            {activeMailboxes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.email}
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            iconLeft={Play}
            disabled={!bulkMailboxId}
            loading={bulkStarting}
            onClick={bulkStart}
          >
            Start working
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconLeft={Pause}
            loading={bulkPausing}
            onClick={() => bulkSetStatus('paused')}
          >
            Pause
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={bulkPausing}
            onClick={() => bulkSetStatus('completed')}
          >
            Mark completed
          </Button>
          <ToolbarSpacer />
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        loading={loading}
        hasMore={hasMore && !search}
        onLoadMore={onLoadMore}
        onRowClick={onSelectCompany}
        selectedRowKey={selectedKey}
        minWidth="1100px"
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
