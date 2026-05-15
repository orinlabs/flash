import { Minus, Play, Plus, RefreshCw, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { StatusDot } from '@/components/ui/status-dot'
import { Textarea } from '@/components/ui/textarea'
import { formatRelative } from '@/lib/format'
import type { Campaign } from '@/api'

interface Props {
  crawls: Campaign[]
  crawlsLoading: boolean
  creating: boolean
  runningId: string | null
  name: string
  icpDocument: string
  targetCount: number
  onNameChange: (value: string) => void
  onIcpDocumentChange: (value: string) => void
  onTargetCountChange: (value: number) => void
  onCreate: (event: React.FormEvent) => void
  onRun: (crawlId: string) => void
  onRefresh: () => void
  onSelectCrawl: (crawl: Campaign) => void
  selectedKey: string | null
}

export function CrawlsPage({
  crawls,
  crawlsLoading,
  creating,
  runningId,
  name,
  icpDocument,
  targetCount,
  onNameChange,
  onIcpDocumentChange,
  onTargetCountChange,
  onCreate,
  onRun,
  onRefresh,
  onSelectCrawl,
  selectedKey
}: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-6">
        <NewCrawlComposer
          name={name}
          icpDocument={icpDocument}
          targetCount={targetCount}
          creating={creating}
          onNameChange={onNameChange}
          onIcpDocumentChange={onIcpDocumentChange}
          onTargetCountChange={onTargetCountChange}
          onCreate={onCreate}
        />
        <RecentCrawls
          crawls={crawls}
          loading={crawlsLoading}
          runningId={runningId}
          onRun={onRun}
          onRefresh={onRefresh}
          onSelectCrawl={onSelectCrawl}
          selectedKey={selectedKey}
        />
      </div>
    </div>
  )
}

function NewCrawlComposer({
  name,
  icpDocument,
  targetCount,
  creating,
  onNameChange,
  onIcpDocumentChange,
  onTargetCountChange,
  onCreate
}: {
  name: string
  icpDocument: string
  targetCount: number
  creating: boolean
  onNameChange: (v: string) => void
  onIcpDocumentChange: (v: string) => void
  onTargetCountChange: (v: number) => void
  onCreate: (e: React.FormEvent) => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <CardTitle>New crawl</CardTitle>
        </div>
        <p className="text-sm text-ink-muted">
          Describe an ideal customer profile. The agent will research matching companies and
          surface qualified people.
        </p>
      </CardHeader>
      <form onSubmit={onCreate}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Q2 design agency outreach"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="icp">ICP description</Label>
            <Textarea
              id="icp"
              variant="code"
              value={icpDocument}
              onChange={(e) => onIcpDocumentChange(e.target.value)}
              rows={6}
              placeholder="Series A-B fintech companies in the US, 50-200 employees, looking for a head of design or VP product."
              required
            />
            <p className="text-xs text-ink-faint">
              Markdown is fine. Be specific about industry, size, role, and signals to find.
            </p>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="target">Target count</Label>
              <div className="inline-flex h-8 items-center rounded-md border border-line bg-surface">
                <button
                  type="button"
                  className="grid h-full w-8 place-items-center text-ink-muted hover:bg-surface-muted"
                  onClick={() => onTargetCountChange(Math.max(1, targetCount - 1))}
                  aria-label="Decrease"
                >
                  <Minus className="size-3.5" />
                </button>
                <input
                  id="target"
                  type="number"
                  min={1}
                  value={targetCount}
                  onChange={(e) => onTargetCountChange(Number(e.target.value))}
                  className="h-full w-14 bg-transparent text-center font-mono text-sm text-ink focus-visible:outline-none"
                />
                <button
                  type="button"
                  className="grid h-full w-8 place-items-center text-ink-muted hover:bg-surface-muted"
                  onClick={() => onTargetCountChange(targetCount + 1)}
                  aria-label="Increase"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <p className="text-xs text-ink-faint">Approx. people the agent will surface.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-faint">
                Cost scales with target.
              </span>
              <Button type="submit" loading={creating} iconLeft={Sparkles}>
                {creating ? 'Creating...' : 'Create crawl'}
              </Button>
            </div>
          </div>
        </CardContent>
      </form>
    </Card>
  )
}

function RecentCrawls({
  crawls,
  loading,
  runningId,
  onRun,
  onRefresh,
  onSelectCrawl,
  selectedKey
}: {
  crawls: Campaign[]
  loading: boolean
  runningId: string | null
  onRun: (id: string) => void
  onRefresh: () => void
  onSelectCrawl: (crawl: Campaign) => void
  selectedKey: string | null
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return crawls
    return crawls.filter((c) =>
      [c.name, c.status].some((v) => v.toLowerCase().includes(q))
    )
  }, [search, crawls])

  const columns: DataTableColumn<Campaign>[] = [
    {
      id: 'name',
      header: 'Name',
      width: '38%',
      cell: (c) => <span className="truncate font-medium text-ink">{c.name}</span>
    },
    {
      id: 'status',
      header: 'Status',
      width: '20%',
      cell: (c) => <StatusDot status={c.status} />
    },
    {
      id: 'target',
      header: 'Target',
      width: '12%',
      align: 'right',
      cell: (c) => (
        <span className="font-mono tabular text-[12.5px] text-ink-muted">
          {c.targetCount}
        </span>
      )
    },
    {
      id: 'updated',
      header: 'Last update',
      width: '18%',
      cell: (c) => (
        <span className="text-xs text-ink-muted">{formatRelative(c.updatedAt) ?? '-'}</span>
      )
    },
    {
      id: 'action',
      header: '',
      width: '110px',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            iconLeft={Play}
            loading={runningId === c.id}
            onClick={(e) => {
              e.stopPropagation()
              onRun(c.id)
            }}
            className="opacity-0 transition-opacity group-hover:opacity-100 data-[loading=true]:opacity-100"
            data-loading={runningId === c.id || undefined}
          >
            Run
          </Button>
        </div>
      )
    }
  ]

  return (
    <Card className="overflow-hidden">
      <div className="flex h-12 items-center gap-2 border-b border-line bg-surface px-3">
        <Input
          iconLeft={Search}
          placeholder="Search crawls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="ml-auto" />
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh"
          onClick={onRefresh}
          loading={loading && crawls.length > 0}
        >
          {!(loading && crawls.length > 0) ? <RefreshCw /> : null}
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        loading={loading}
        onRowClick={onSelectCrawl}
        selectedRowKey={selectedKey}
        empty={{
          icon: Sparkles,
          title: 'No crawls yet',
          description:
            'Create your first crawl above. Once it runs, results land in People and Companies.',
          compact: true
        }}
      />
    </Card>
  )
}
