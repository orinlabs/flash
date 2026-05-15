import { Building2, ChevronRight, ListChecks, RefreshCw, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { apiGet, type Company, type Person, type ProspectList, type ProspectListDetail } from '@/api'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'
import { faviconUrl, formatRelative } from '@/lib/format'

interface Props {
  lists: ProspectList[]
  loading: boolean
  onRefresh: () => void
  onSelectPerson: (person: Person) => void
  onSelectCompany: (company: Company) => void
  onError: (message: string) => void
}

export function ListsPage({
  lists,
  loading,
  onRefresh,
  onSelectPerson,
  onSelectCompany,
  onError
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProspectListDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const selectedList = useMemo(
    () => lists.find((list) => list.id === selectedId) ?? null,
    [lists, selectedId]
  )

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }

    let cancelled = false
    setDetailLoading(true)
    ;(async () => {
      try {
        const row = await apiGet<ProspectListDetail>('/lists/' + selectedId)
        if (!cancelled) setDetail(row)
      } catch (err) {
        if (!cancelled) {
          onError(err instanceof Error ? err.message : 'Failed to load list')
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedId, onError])

  const columns: DataTableColumn<ProspectList>[] = [
    {
      id: 'name',
      header: 'List',
      width: '42%',
      cell: (list) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-accent-soft text-accent">
            {list.type === 'people' ? <Users className="size-4" /> : <Building2 className="size-4" />}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{list.name}</div>
            <div className="text-xs text-ink-faint">
              {list.type === 'people' ? 'People list' : 'Company list'}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'count',
      header: 'Items',
      width: '90px',
      align: 'right',
      cell: (list) => (
        <span className="font-mono tabular text-[12.5px] text-ink-muted">
          {list.type === 'people' ? list.personCount : list.companyCount}
        </span>
      )
    },
    {
      id: 'created',
      header: 'Created',
      width: '160px',
      cell: (list) => (
        <span className="text-[12.5px] text-ink-muted">
          {formatRelative(list.createdAt) ?? '-'}
        </span>
      )
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
    <section className="flex min-h-0 flex-1 bg-surface">
      <div className="flex min-w-0 flex-1 flex-col border-r border-line">
        <Toolbar>
          <div className="text-sm text-ink-muted">Saved people and company groups.</div>
          <ToolbarSpacer />
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh"
            onClick={onRefresh}
            loading={loading && lists.length > 0}
          >
            {!(loading && lists.length > 0) ? <RefreshCw /> : null}
          </Button>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={lists}
          rowKey={(list) => list.id}
          loading={loading}
          onRowClick={(list) => setSelectedId(list.id)}
          selectedRowKey={selectedId}
          minWidth="680px"
          empty={{
            icon: ListChecks,
            title: 'No lists yet',
            description: 'Run agentic search on people or companies, then save the matches as a list.'
          }}
        />
      </div>
      <aside className="hidden w-[380px] shrink-0 flex-col bg-surface lg:flex">
        <ListDetail
          list={detail ?? selectedList}
          loading={detailLoading}
          onSelectPerson={onSelectPerson}
          onSelectCompany={onSelectCompany}
        />
      </aside>
    </section>
  )
}

function ListDetail({
  list,
  loading,
  onSelectPerson,
  onSelectCompany
}: {
  list: ProspectList | ProspectListDetail | null
  loading: boolean
  onSelectPerson: (person: Person) => void
  onSelectCompany: (company: Company) => void
}) {
  if (!list) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-ink-muted">
        Select a list to preview its members.
      </div>
    )
  }

  const people = 'people' in list ? list.people : []
  const companies = 'companies' in list ? list.companies : []
  const count = list.type === 'people' ? list.personCount : list.companyCount

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-4 py-3">
        <div className="text-sm font-semibold text-ink">{list.name}</div>
        <div className="text-xs text-ink-faint">
          {count} {count === 1 ? 'item' : 'items'}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {loading ? (
          <div className="p-3 text-sm text-ink-muted">Loading members...</div>
        ) : list.type === 'people' ? (
          people.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelectPerson(person)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-surface-muted"
            >
              <Avatar size="sm" name={person.fullName ?? '?'} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {person.fullName ?? 'Unnamed'}
                </span>
                <span className="block truncate text-xs text-ink-faint">
                  {person.title ?? person.email ?? '-'}
                </span>
              </span>
            </button>
          ))
        ) : (
          companies.map((company) => {
            const fav = faviconUrl(company.domain ?? company.website)
            return (
              <button
                key={company.id}
                type="button"
                onClick={() => onSelectCompany(company)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-surface-muted"
              >
                {fav ? (
                  <img src={fav} alt="" className="size-5 rounded-sm border border-line" />
                ) : (
                  <span className="size-5 rounded-sm border border-line bg-surface-muted" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {company.name}
                  </span>
                  <span className="block truncate text-xs text-ink-faint">
                    {company.domain ?? company.website ?? '-'}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
