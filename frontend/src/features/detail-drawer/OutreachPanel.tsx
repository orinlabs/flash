import { Play } from 'lucide-react'
import { useEffect, useState } from 'react'

import { apiGet, apiPatch, apiPost, type Company, type Mailbox, type OutreachDraft, type OutreachEvent } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/ui/status-dot'
import { Textarea } from '@/components/ui/textarea'
import { formatRelative } from '@/lib/format'

import { SectionCard } from './drawer-ui'

export function OutreachPanel({
  company,
  mailboxes,
  onCompanyChanged,
  onError
}: {
  company: Company
  mailboxes: Mailbox[]
  onCompanyChanged?: () => void
  onError?: (msg: string) => void
}) {
  const [strategy, setStrategy] = useState(company.outreachStrategy ?? '')
  const [strategyDirty, setStrategyDirty] = useState(false)
  const [savingStrategy, setSavingStrategy] = useState(false)
  const [mailboxId, setMailboxId] = useState(company.outreachMailboxId ?? '')
  const [status, setStatus] = useState(company.outreachStatus)
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState<OutreachEvent[]>([])
  const [drafts, setDrafts] = useState<OutreachDraft[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)

  useEffect(() => {
    setStrategy(company.outreachStrategy ?? '')
    setStrategyDirty(false)
    setMailboxId(company.outreachMailboxId ?? '')
    setStatus(company.outreachStatus)
  }, [
    company.id,
    company.outreachStrategy,
    company.outreachMailboxId,
    company.outreachStatus
  ])

  useEffect(() => {
    let cancelled = false
    setEventsLoading(true)
    Promise.all([
      apiGet<{ data: OutreachEvent[] }>('/companies/' + company.id + '/outreach/events?limit=25'),
      apiGet<{ data: OutreachDraft[] }>('/companies/' + company.id + '/outreach/drafts?limit=10')
    ])
      .then(([eRes, dRes]) => {
        if (cancelled) return
        setEvents(eRes.data)
        setDrafts(dRes.data)
      })
      .catch((err) => {
        if (!cancelled) onError?.(err instanceof Error ? err.message : 'Failed to load outreach data')
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [company.id, onError])

  const activeMailboxes = mailboxes.filter((m) => m.status === 'active')
  const noMailbox = activeMailboxes.length === 0

  async function patchOutreach(patch: Record<string, unknown>) {
    try {
      await apiPatch('/companies/' + company.id + '/outreach', patch)
      onCompanyChanged?.()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Update failed')
    }
  }

  async function saveStrategy() {
    setSavingStrategy(true)
    await patchOutreach({ outreachStrategy: strategy })
    setStrategyDirty(false)
    setSavingStrategy(false)
  }

  async function runNow() {
    if (!mailboxId) {
      onError?.('Assign a mailbox before running.')
      return
    }
    setRunning(true)
    try {
      await apiPost('/companies/' + company.id + '/outreach/run')
      onCompanyChanged?.()
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  async function snooze(hours: number) {
    const wakeAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    await patchOutreach({ outreachNextWakeAt: wakeAt })
  }

  return (
    <>
      <SectionCard title="Status">
        <div className="space-y-2 py-1">
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-ink-faint">Status</span>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => {
                  const next = e.target.value as Company['outreachStatus']
                  setStatus(next)
                  patchOutreach({ outreachStatus: next })
                }}
                className="h-8 rounded-md border border-line bg-surface px-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25"
              >
                <option value="dormant">Dormant</option>
                <option value="working">Working</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="dead">Dead</option>
              </select>
              <StatusDot status={status} size="sm" />
            </div>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-ink-faint">Mailbox</span>
            <select
              value={mailboxId}
              onChange={(e) => {
                const next = e.target.value
                setMailboxId(next)
                patchOutreach({ outreachMailboxId: next || null })
              }}
              disabled={noMailbox}
              className="h-8 rounded-md border border-line bg-surface px-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-50"
            >
              <option value="">{noMailbox ? 'No mailboxes connected' : 'Unassigned'}</option>
              {activeMailboxes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.email}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[100px_1fr] items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-ink-faint">Next wake</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink">
                {company.outreachNextWakeAt
                  ? formatRelative(company.outreachNextWakeAt) ?? '-'
                  : '-'}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => snooze(24)}>
                  +1d
                </Button>
                <Button variant="outline" size="sm" onClick={() => snooze(72)}>
                  +3d
                </Button>
                <Button variant="outline" size="sm" onClick={() => snooze(24 * 7)}>
                  +1w
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={Play}
                  loading={running}
                  onClick={runNow}
                >
                  Run now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Strategy (agent memory; editable)">
        <Textarea
          value={strategy}
          onChange={(e) => {
            setStrategy(e.target.value)
            setStrategyDirty(true)
          }}
          variant="code"
          className="min-h-[240px]"
          placeholder="Your editable plan for this account. The agent reads this verbatim on every wake-up and updates it as it works."
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-2xs text-ink-faint">
            Saving the strategy nudges the agent to wake immediately.
          </span>
          <Button
            variant="primary"
            size="sm"
            disabled={!strategyDirty}
            loading={savingStrategy}
            onClick={saveStrategy}
          >
            Save strategy
          </Button>
        </div>
      </SectionCard>

      <SectionCard title={'Drafts (' + drafts.length + ')'}>
        {drafts.length === 0 ? (
          <p className="py-3 text-sm text-ink-faint">No drafts for this account yet.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-line">
            {drafts.map((d) => (
              <li key={d.id} className="px-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{d.subject}</span>
                  <StatusDot status={d.status} size="sm" />
                </div>
                <div className="truncate text-xs text-ink-muted">
                  to {d.toEmail} • {formatRelative(d.createdAt) ?? '-'}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-2xs text-ink-faint">
          Review, edit, and approve drafts in the Drafts page.
        </p>
      </SectionCard>

      <SectionCard title={'Timeline (' + events.length + ')'}>
        {eventsLoading && events.length === 0 ? (
          <p className="py-3 text-center text-sm text-ink-faint">Loading...</p>
        ) : events.length === 0 ? (
          <p className="py-3 text-sm text-ink-faint">No timeline entries yet.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-line">
            {events.map((e) => (
              <li key={e.id} className="px-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="mono">{e.kind}</Badge>
                  <span className="text-2xs text-ink-faint">
                    {formatRelative(e.createdAt) ?? '-'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-ink">{e.summary}</div>
                {e.sourceUrl ? (
                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-block break-all text-2xs text-ink-muted underline-offset-4 hover:text-accent hover:underline"
                  >
                    {e.sourceUrl}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
  )
}
