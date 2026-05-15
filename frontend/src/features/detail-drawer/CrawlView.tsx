import { Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { apiGet, type Campaign, type CampaignRun, type Person, type UsageByCampaignRow, type UsageByRunRow } from '@/api'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DrawerBody, DrawerTabs, DrawerTabsContent, DrawerTabsList, DrawerTabsTrigger } from '@/components/ui/drawer'
import { StatusDot, statusToTone } from '@/components/ui/status-dot'
import { formatDate, formatRelative, formatTokens, formatUsd } from '@/lib/format'
import { buildCrawlPeopleListPath } from '@/lib/listFetchParams'
import { cn } from '@/lib/utils'

import { EmptyTab, KV, SectionCard, Stat } from './drawer-ui'

type PagedPeopleResponse = { data: Person[]; limit: number; offset: number }

export function CrawlView({
  crawl,
  runs,
  runsLoading,
  people,
  peopleLoading,
  usage,
  onSelectPerson,
  onViewPeopleForCrawl
}: {
  crawl: Campaign
  runs: CampaignRun[]
  runsLoading: boolean
  people: Person[]
  peopleLoading: boolean
  usage: { totals: UsageByCampaignRow | null; runs: UsageByRunRow[] } | null
  onSelectPerson: (person: Person) => void
  onViewPeopleForCrawl?: (crawlId: string, campaignRunId?: string | null) => void
}) {
  const totalQualified = runs.reduce((acc, r) => acc + (r.qualifiedCount ?? 0), 0)
  const usageByRunId = new Map(
    (usage?.runs ?? [])
      .filter((r): r is UsageByRunRow & { campaignRunId: string } =>
        Boolean(r.campaignRunId)
      )
      .map((r) => [r.campaignRunId, r] as const)
  )
  return (
    <DrawerTabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
      <DrawerTabsList>
        <DrawerTabsTrigger value="overview">Overview</DrawerTabsTrigger>
        <DrawerTabsTrigger value="progress">
          Progress
          <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
            {runs.length}
          </span>
        </DrawerTabsTrigger>
        <DrawerTabsTrigger value="people">
          People
          <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
            {people.length}
          </span>
        </DrawerTabsTrigger>
      </DrawerTabsList>

      <DrawerTabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody className="space-y-4">
          <SectionCard title="Configuration">
            <KV label="Status" value={<StatusDot status={crawl.status} />} />
            <KV
              label="Target"
              value={
                <span className="font-mono tabular text-[12.5px] text-ink-muted">
                  {crawl.targetCount} people
                </span>
              }
            />
            <KV label="Created" value={formatDate(crawl.createdAt)} />
            <KV label="Updated" value={formatDate(crawl.updatedAt)} />
          </SectionCard>

          <SectionCard title="ICP description">
            <pre className="whitespace-pre-wrap break-words rounded-md bg-surface-muted/60 p-3 font-mono text-[12.5px] leading-[18px] text-ink">
              {crawl.icpDocument}
            </pre>
          </SectionCard>

          <SectionCard title="Output">
            <KV
              label="Found"
              value={
                <span className="font-mono tabular text-[12.5px] text-ink-muted">
                  {people.length} {people.length === 1 ? 'person' : 'people'}
                </span>
              }
            />
            <KV
              label="Qualified"
              value={
                <span className="font-mono tabular text-[12.5px] text-ink-muted">
                  {totalQualified}
                </span>
              }
            />
            <KV
              label="Runs"
              value={
                <span className="font-mono tabular text-[12.5px] text-ink-muted">
                  {runs.length}
                </span>
              }
            />
            {people.length > 0 && onViewPeopleForCrawl ? (
              <div className="border-t border-line px-4 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={Users}
                  onClick={() => onViewPeopleForCrawl(crawl.id)}
                >
                  View in People
                </Button>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Usage">
            <KV
              label="Spend"
              value={
                <span className="font-mono tabular text-[12.5px] text-ink">
                  {formatUsd(usage?.totals?.costUsd ?? 0)}
                </span>
              }
            />
            <KV
              label="Tokens"
              value={
                <span className="font-mono tabular text-[12.5px] text-ink-muted">
                  {formatTokens(usage?.totals?.totalTokens ?? 0)}
                </span>
              }
            />
            <KV
              label="Events"
              value={
                <span className="font-mono tabular text-[12.5px] text-ink-muted">
                  {usage?.totals?.events ?? 0}
                </span>
              }
            />
            {people.length > 0 && usage?.totals ? (
              <KV
                label="$ / person"
                value={
                  <span className="font-mono tabular text-[12.5px] text-ink-muted">
                    {formatUsd(Number(usage.totals.costUsd) / people.length)}
                  </span>
                }
              />
            ) : null}
          </SectionCard>
        </DrawerBody>
      </DrawerTabsContent>

      <DrawerTabsContent value="progress" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody>
          {runsLoading && runs.length === 0 ? (
            <SectionCard title="Runs">
              <p className="py-4 text-center text-sm text-ink-faint">Loading runs...</p>
            </SectionCard>
          ) : runs.length === 0 ? (
            <EmptyTab
              title="No runs yet"
              description="Click Run to dispatch the agent. Each attempt will appear here with its progress."
            />
          ) : (
            <div className="space-y-3">
              {runs.map((run, idx) => (
                <RunRow
                  run={run}
                  index={runs.length - idx}
                  usage={usageByRunId.get(run.id) ?? null}
                  crawlId={crawl.id}
                  onSelectPerson={onSelectPerson}
                  onViewPeopleForCrawl={onViewPeopleForCrawl}
                  key={run.id}
                />
              ))}
            </div>
          )}
        </DrawerBody>
      </DrawerTabsContent>

      <DrawerTabsContent value="people" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody>
          {peopleLoading && people.length === 0 ? (
            <SectionCard title="People">
              <p className="py-4 text-center text-sm text-ink-faint">Loading people...</p>
            </SectionCard>
          ) : people.length === 0 ? (
            <EmptyTab
              title="No people yet"
              description="People discovered by this crawl will appear here once a run completes."
            />
          ) : (
            <div className="space-y-3">
              {onViewPeopleForCrawl ? (
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={Users}
                  onClick={() => onViewPeopleForCrawl(crawl.id)}
                >
                  View all in People
                </Button>
              ) : null}
              <div className="overflow-hidden rounded-lg border border-line bg-surface">
                {people.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPerson(p)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted/60',
                      idx > 0 && 'border-t border-line'
                    )}
                  >
                    <Avatar size="md" name={p.fullName ?? '?'} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">
                        {p.fullName ?? 'Unnamed'}
                      </div>
                      <div className="truncate text-xs text-ink-muted">
                        {p.title ?? '-'}
                      </div>
                    </div>
                    <StatusDot status={p.lifecycleStatus} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DrawerBody>
      </DrawerTabsContent>
    </DrawerTabs>
  )
}

function RunRow({
  run,
  index,
  usage,
  crawlId,
  onSelectPerson,
  onViewPeopleForCrawl
}: {
  run: CampaignRun
  index: number
  usage: UsageByRunRow | null
  crawlId: string
  onSelectPerson: (person: Person) => void
  onViewPeopleForCrawl?: (crawlId: string, campaignRunId?: string | null) => void
}) {
  const [runPeople, setRunPeople] = useState<Person[]>([])
  const [runPeopleLoading, setRunPeopleLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setRunPeopleLoading(true)
    setRunPeople([])
    void apiGet<PagedPeopleResponse>(buildCrawlPeopleListPath(crawlId, run.id))
      .then((res) => {
        if (!cancelled) setRunPeople(res.data)
      })
      .catch(() => {
        if (!cancelled) setRunPeople([])
      })
      .finally(() => {
        if (!cancelled) setRunPeopleLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [crawlId, run.id])

  const tone = statusToTone(run.status)
  const checkpointStep =
    typeof run.checkpoint?.step === 'string' ? (run.checkpoint.step as string) : null
  const checkpointEntries = Object.entries(run.checkpoint ?? {}).filter(
    ([k]) => k !== 'step'
  )
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-ink-faint">#{index}</span>
          <StatusDot tone={tone.tone} label={tone.label} />
        </div>
        <div className="flex items-center gap-2">
          {onViewPeopleForCrawl ? (
            <Button
              variant="ghost"
              size="sm"
              iconLeft={Users}
              disabled={runPeopleLoading}
              onClick={() => onViewPeopleForCrawl(crawlId, run.id)}
            >
              {runPeopleLoading
                ? 'People…'
                : 'People' + (runPeople.length > 0 ? ' (' + runPeople.length + ')' : '')}
            </Button>
          ) : null}
          <span className="text-xs text-ink-muted">
            {formatRelative(run.createdAt) ?? '-'}
          </span>
        </div>
      </header>
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat
            label="Qualified"
            value={
              <span className="font-mono tabular text-sm text-ink">
                {run.qualifiedCount}
              </span>
            }
          />
          <Stat
            label="Found"
            value={
              runPeopleLoading ? (
                <span className="text-sm text-ink-faint">…</span>
              ) : (
                <span className="font-mono tabular text-sm text-ink">
                  {runPeople.length}
                </span>
              )
            }
          />
          <Stat
            label="Cost"
            value={
              <span className="font-mono tabular text-sm text-ink">
                {formatUsd(usage?.costUsd ?? 0)}
              </span>
            }
          />
          <Stat
            label="Tokens"
            value={
              <span className="font-mono tabular text-sm text-ink-muted">
                {formatTokens(usage?.totalTokens ?? 0)}
              </span>
            }
          />
          <Stat
            label="Step"
            value={
              checkpointStep ? (
                <span className="font-mono text-[12px] text-ink">
                  {checkpointStep.replace(/_/g, ' ')}
                </span>
              ) : (
                <span className="text-ink-faint">-</span>
              )
            }
          />
        </div>

        {checkpointEntries.length > 0 ? (
          <details className="mt-3">
            <summary className="cursor-pointer select-none text-xs text-ink-muted hover:text-ink">
              Checkpoint
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-surface-muted/60 p-2 font-mono text-[11.5px] leading-[16px] text-ink">
              {JSON.stringify(run.checkpoint, null, 2)}
            </pre>
          </details>
        ) : null}

        {run.lastError ? (
          <div className="mt-3 rounded-md border border-bad/30 bg-bad/5 px-3 py-2 text-[12px] text-ink">
            <div className="mb-1 font-medium text-bad">Error</div>
            <pre className="whitespace-pre-wrap break-words font-mono text-[11.5px] leading-[16px]">
              {run.lastError}
            </pre>
          </div>
        ) : null}

        {!runPeopleLoading && runPeople.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-md border border-line">
            {runPeople.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPerson(p)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-muted/60',
                  idx > 0 && 'border-t border-line'
                )}
              >
                <Avatar size="sm" name={p.fullName ?? '?'} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-ink">{p.fullName ?? 'Unnamed'}</div>
                  <div className="truncate text-xs text-ink-muted">{p.title ?? '-'}</div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>

  )
}
