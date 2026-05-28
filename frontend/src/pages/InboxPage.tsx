import {
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  MailSearch,
  RefreshCw,
  Search,
  Sparkles,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  apiGet,
  apiPost,
  type ExternalEmailCandidate,
  type ExternalEmailCandidateClassification,
  type ExternalEmailCandidateStatus,
  type InboxCandidatesScanSummary
} from '@/api'
import { Badge } from '@/components/ui/badge'
import { Banner } from '@/components/ui/banner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  onCandidatesChanged?: () => void
  onOpenDraft?: (draftId: string) => void
}

const STATUS_OPTIONS: { value: ExternalEmailCandidateStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'imported', label: 'Imported' },
  { value: 'ignored', label: 'Ignored' },
  { value: 'all', label: 'All' }
]

const CLASSIFICATION_LABELS: Record<ExternalEmailCandidateClassification, string> = {
  cold_intro: 'Cold intro',
  follow_up: 'Follow up',
  other: 'Other'
}

export function InboxPage({ onCandidatesChanged, onOpenDraft }: Props) {
  const [status, setStatus] = useState<ExternalEmailCandidateStatus | 'all'>('pending')
  const [rows, setRows] = useState<ExternalEmailCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [companyOverride, setCompanyOverride] = useState('')
  const [importing, setImporting] = useState(false)
  const [ignoring, setIgnoring] = useState(false)
  const [scanSummary, setScanSummary] = useState<InboxCandidatesScanSummary | null>(null)

  const load = useCallback(
    async (preferredSelectedId: string | null) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ status })
        const res = await apiGet<{ data: ExternalEmailCandidate[] }>(
          '/inbox-candidates?' + params.toString()
        )
        setRows(res.data)
        let nextSelectedId = preferredSelectedId
        if (
          res.data.length > 0 &&
          !res.data.some((r) => r.id === preferredSelectedId)
        ) {
          nextSelectedId = res.data[0].id
        } else if (res.data.length === 0) {
          nextSelectedId = null
        }
        setSelectedId(nextSelectedId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load candidates')
      } finally {
        setLoading(false)
      }
    },
    [status]
  )

  useEffect(() => {
    void load(selectedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    setCompanyOverride('')
  }, [selectedId])

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId]
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = [
        r.toEmail,
        r.fromEmail,
        r.subject,
        r.bodyPreview,
        r.rationale,
        r.mailbox?.email
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

  async function scan() {
    setScanning(true)
    setError(null)
    try {
      const summary = await apiPost<InboxCandidatesScanSummary>(
        '/inbox-candidates/scan',
        {}
      )
      setScanSummary(summary)
      await load(selectedId)
      onCandidatesChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  async function importCandidate() {
    if (!selected) return
    setImporting(true)
    setError(null)
    try {
      const body: Record<string, string> = {}
      if (companyOverride.trim()) body.companyName = companyOverride.trim()
      const res = await apiPost<{ draft: { id: string } }>(
        '/inbox-candidates/' + selected.id + '/import',
        body
      )
      await load(selected.id)
      onCandidatesChanged?.()
      if (res.draft?.id && onOpenDraft) {
        onOpenDraft(res.draft.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function ignoreCandidate() {
    if (!selected) return
    setIgnoring(true)
    setError(null)
    try {
      await apiPost('/inbox-candidates/' + selected.id + '/ignore', {})
      await load(selected.id)
      onCandidatesChanged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ignore failed')
    } finally {
      setIgnoring(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
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

      {scanSummary ? (
        <div className="border-b border-line bg-bg px-5 py-2.5">
          <Banner
            tone="info"
            title={
              'Scan complete: ' +
              scanSummary.candidates +
              ' candidate' +
              (scanSummary.candidates === 1 ? '' : 's') +
              ' found across ' +
              scanSummary.mailboxesScanned +
              ' mailbox' +
              (scanSummary.mailboxesScanned === 1 ? '' : 'es')
            }
            description={
              scanSummary.scanned +
              ' messages classified, ' +
              scanSummary.skipped +
              ' skipped, ' +
              scanSummary.errors +
              ' errors.'
            }
            onDismiss={() => setScanSummary(null)}
          />
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] divide-x divide-line">
        {/* Queue */}
        <div className="flex min-h-0 flex-col">
          <div className="shrink-0 border-b border-line px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-baseline gap-1.5">
                <MailSearch className="size-3.5 text-ink-faint" />
                <span className="text-[13px] font-semibold text-ink">
                  {filteredRows.length}
                </span>
                <span className="text-2xs text-ink-muted">
                  {status === 'all' ? 'all' : status}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                iconLeft={scanning ? Loader2 : RefreshCw}
                loading={scanning}
                onClick={() => void scan()}
              >
                Scan now
              </Button>
            </div>

            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-2xs transition-colors',
                    status === opt.value
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-line bg-surface text-ink-muted hover:bg-surface-muted'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipient, subject, body…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && rows.length === 0 ? (
              <div className="grid place-items-center px-6 py-12 text-sm text-ink-muted">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="px-6 py-10">
                <EmptyState
                  icon={MailSearch}
                  title={
                    status === 'pending'
                      ? 'No candidates pending'
                      : 'No candidates here'
                  }
                  description={
                    status === 'pending'
                      ? 'Click Scan now to look for outbound intros in your connected mailboxes.'
                      : 'Switch the filter or scan your mailboxes to find more.'
                  }
                />
              </div>
            ) : (
              <ul>
                {filteredRows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        'group relative flex w-full flex-col gap-1 border-b border-line/60 px-4 py-3 text-left transition-colors',
                        'hover:bg-surface-muted/60',
                        selectedId === row.id && 'bg-surface-muted'
                      )}
                    >
                      {selectedId === row.id ? (
                        <span
                          aria-hidden
                          className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent"
                        />
                      ) : null}
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-[13px] font-semibold text-ink">
                          {row.toEmail ?? '(no recipient)'}
                        </span>
                        <span className="shrink-0 text-2xs text-ink-faint">
                          {formatRelative(row.sentAt) ?? '-'}
                        </span>
                      </div>
                      <div className="truncate text-[13px] text-ink">
                        {row.subject ?? '(no subject)'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            row.classification === 'cold_intro' ? 'accent' : 'soft'
                          }
                          className="h-5 px-1.5 text-2xs"
                        >
                          {CLASSIFICATION_LABELS[row.classification]}
                        </Badge>
                        {row.mailbox?.email ? (
                          <span className="truncate font-mono text-[11px] text-ink-faint">
                            from {row.mailbox.email}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="flex min-h-0 flex-col">
          {selected ? (
            <CandidateDetail
              candidate={selected}
              companyOverride={companyOverride}
              onCompanyOverrideChange={setCompanyOverride}
              importing={importing}
              ignoring={ignoring}
              onImport={() => void importCandidate()}
              onIgnore={() => void ignoreCandidate()}
            />
          ) : (
            <div className="grid flex-1 place-items-center px-6 py-12">
              <EmptyState
                icon={MailSearch}
                title="Pick a candidate"
                description="Choose an outbound email on the left to review and import."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CandidateDetail({
  candidate,
  companyOverride,
  onCompanyOverrideChange,
  importing,
  ignoring,
  onImport,
  onIgnore
}: {
  candidate: ExternalEmailCandidate
  companyOverride: string
  onCompanyOverrideChange: (v: string) => void
  importing: boolean
  ignoring: boolean
  onImport: () => void
  onIgnore: () => void
}) {
  const recipientDomain = candidate.toEmail?.split('@')[1]?.toLowerCase() ?? null
  const isActionable = candidate.status === 'pending'
  const gmailLink = candidate.gmailMessageId
    ? 'https://mail.google.com/mail/u/0/#sent/' + candidate.gmailMessageId
    : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 shrink-0 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="flex items-start justify-between gap-3 px-5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  candidate.classification === 'cold_intro' ? 'accent' : 'soft'
                }
                className="h-5 shrink-0 px-1.5 text-2xs uppercase tracking-wide"
              >
                {CLASSIFICATION_LABELS[candidate.classification]}
              </Badge>
              <span className="truncate text-sm font-semibold text-ink">
                {candidate.subject ?? '(no subject)'}
              </span>
              {gmailLink ? (
                <a
                  href={gmailLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-2xs text-ink-muted underline-offset-4 hover:text-accent hover:underline"
                >
                  Open in Gmail <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
            <div className="mt-0.5 truncate text-xs text-ink-muted">
              To <span className="font-mono text-ink">{candidate.toEmail ?? '-'}</span>
              {candidate.mailbox?.email ? (
                <>
                  {' · '}from <span className="font-mono">{candidate.mailbox.email}</span>
                </>
              ) : null}
              {candidate.sentAt ? ' · sent ' + (formatRelative(candidate.sentAt) ?? '') : ''}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isActionable ? (
              <>
                <Button
                  variant="outline"
                  size="md"
                  iconLeft={X}
                  loading={ignoring}
                  onClick={onIgnore}
                >
                  Ignore
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  iconLeft={Check}
                  loading={importing}
                  onClick={onImport}
                >
                  Add to pipeline
                </Button>
              </>
            ) : candidate.status === 'imported' ? (
              <Badge variant="accent" className="h-6 px-2 text-2xs uppercase">
                Imported
              </Badge>
            ) : (
              <Badge variant="soft" className="h-6 px-2 text-2xs uppercase">
                Ignored
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] space-y-5 px-5 py-5">
          {candidate.rationale ? (
            <section className="rounded-lg border border-accent/20 bg-accent-soft/40 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-accent">
                <Sparkles className="size-3" />
                Classifier rationale
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink">
                {candidate.rationale}
              </p>
              {candidate.confidence ? (
                <div className="mt-1 text-2xs text-ink-faint">
                  Confidence{' '}
                  {(Number(candidate.confidence) * 100).toFixed(0)}%
                </div>
              ) : null}
            </section>
          ) : null}

          {isActionable ? (
            <section className="rounded-lg border border-line bg-surface">
              <div className="border-b border-line/70 px-4 py-2">
                <div className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
                  Add to pipeline
                </div>
                <p className="mt-0.5 text-xs text-ink-muted">
                  We will create (or reuse) a company by domain and attach this send as a sent draft.
                </p>
              </div>
              <div className="space-y-2 p-3">
                <label className="block text-2xs font-medium uppercase tracking-wide text-ink-faint">
                  Company name override
                </label>
                <Input
                  value={companyOverride}
                  onChange={(e) => onCompanyOverrideChange(e.target.value)}
                  placeholder={
                    recipientDomain
                      ? 'Derived from ' + recipientDomain + ' if left blank'
                      : 'Company name'
                  }
                />
                <p className="text-2xs text-ink-faint">
                  Optional. If the domain already maps to a known company, that company is used.
                </p>
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
            <div className="border-b border-line/70 bg-surface-muted/40 px-4 py-2 text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Email body (excerpt)
            </div>
            <div className="px-4 py-4">
              <pre className="whitespace-pre-wrap break-words font-sans text-[14px] leading-[22px] text-ink">
                {candidate.bodyPreview?.trim() || '(no body captured)'}
              </pre>
            </div>
          </section>

          {candidate.importedDraftId ? (
            <section className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-muted">
              <div className="flex items-center gap-2">
                <span>Imported as draft</span>
                <code className="font-mono text-[12px] text-ink">{candidate.importedDraftId.slice(0, 8)}</code>
                <ChevronRight className="size-3" />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
