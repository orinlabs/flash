import { Inbox, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { apiGet, type DraftDetail, type DraftQueueRow, type Mailbox, type OutreachDraftStatus } from '@/api'
import { Banner } from '@/components/ui/banner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'

import { DraftDetailPanel } from '@/features/drafts/DraftDetailPanel'
import { DraftListItem } from '@/features/drafts/DraftListItem'

const STATUS_OPTIONS: { value: OutreachDraftStatus | 'all'; label: string }[] = [
  { value: 'pending_review', label: 'Pending review' },
  { value: 'sent', label: 'Sent' },
  { value: 'discarded', label: 'Discarded' },
  { value: 'failed', label: 'Failed' },
  { value: 'all', label: 'All' }
]

type LoadResult = { ok: true; selectedId: string | null } | { ok: false }

interface Props {
  mailboxes: Mailbox[]
  onPendingReviewChanged?: () => void
}

export function DraftsPage({ mailboxes, onPendingReviewChanged }: Props) {
  const [status, setStatus] = useState<OutreachDraftStatus | 'all'>('pending_review')
  const [mailboxId, setMailboxId] = useState<string | 'all'>('all')
  const [rows, setRows] = useState<DraftQueueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DraftDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  async function load(): Promise<LoadResult> {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      else params.set('status', '')
      if (mailboxId !== 'all') params.set('mailboxId', mailboxId)
      const qs = params.toString()
      const res = await apiGet<{ data: DraftQueueRow[] }>('/drafts' + (qs ? '?' + qs : ''))
      setRows(res.data)
      let nextSelectedId = selectedId
      if (res.data.length > 0 && !res.data.some((r) => r.draft.id === selectedId)) {
        nextSelectedId = res.data[0].draft.id
      } else if (res.data.length === 0) {
        nextSelectedId = null
      }
      setSelectedId(nextSelectedId)
      return { ok: true, selectedId: nextSelectedId }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts')
      return { ok: false }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mailboxId])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    apiGet<DraftDetail>('/drafts/' + selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load draft')
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  async function refreshAfterAction() {
    const currentSelectedId = selectedId
    const result = await load()
    onPendingReviewChanged?.()
    if (!result.ok) return
    if (result.selectedId !== currentSelectedId) {
      setDetail(null)
      return
    }
    if (result.selectedId) {
      setDetailLoading(true)
      apiGet<DraftDetail>('/drafts/' + result.selectedId)
        .then(setDetail)
        .catch((err) => setError(err instanceof Error ? err.message : 'Refresh failed'))
        .finally(() => setDetailLoading(false))
    }
  }

  const mailboxOptions = useMemo(
    () => [{ id: 'all', email: 'All mailboxes' }, ...mailboxes.map((m) => ({ id: m.id, email: m.email }))],
    [mailboxes]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <Toolbar>
        <div className="flex items-center gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={status === opt.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStatus(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <ToolbarSpacer />
        <select
          value={mailboxId}
          onChange={(e) => setMailboxId(e.target.value as 'all' | string)}
          className="h-8 rounded-md border border-line bg-surface px-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25"
        >
          {mailboxOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.email}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh"
          onClick={() => {
            void load()
            onPendingReviewChanged?.()
          }}
          loading={loading && rows.length > 0}
        >
          {!(loading && rows.length > 0) ? <RefreshCw /> : null}
        </Button>
      </Toolbar>

      {error ? (
        <div className="border-b border-line bg-bg px-5 py-2.5">
          <Banner
            tone="error"
            title="Something went wrong"
            description={error}
            onDismiss={() => setError(null)}
          />
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,400px)_minmax(0,1fr)] divide-x divide-line">
        <div className="min-h-0 overflow-y-auto">
          {loading && rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-muted">Loading...</div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={
                status === 'pending_review'
                  ? 'No drafts to review'
                  : 'No drafts match this filter'
              }
              description={
                status === 'pending_review'
                  ? 'Once you start working accounts on the Companies page, drafts will land here.'
                  : 'Switch the filter above to see other drafts.'
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((row) => (
                <DraftListItem
                  key={row.draft.id}
                  row={row}
                  selected={selectedId === row.draft.id}
                  onSelect={() => setSelectedId(row.draft.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto">
          {!selectedId ? (
            <div className="grid h-full place-items-center p-10 text-center text-sm text-ink-muted">
              Select a draft to review.
            </div>
          ) : detailLoading && !detail ? (
            <div className="flex h-full items-center justify-center gap-2 p-10 text-sm text-ink-muted">
              <Loader2 className="size-4 animate-spin" /> Loading draft...
            </div>
          ) : detail ? (
            <DraftDetailPanel
              detail={detail}
              onChanged={refreshAfterAction}
              onError={setError}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
