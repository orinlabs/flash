import { ExternalLink, Globe, MapPin, Play } from 'lucide-react'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTabs,
  DrawerTabsContent,
  DrawerTabsList,
  DrawerTabsTrigger
} from '@/components/ui/drawer'
import { StatusDot, statusToTone } from '@/components/ui/status-dot'
import {
  domainFromUrl,
  faviconUrl,
  formatDate,
  formatRelative,
  formatTokens,
  formatUsd
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  Campaign,
  CampaignRun,
  Company,
  Person,
  UsageByCampaignRow,
  UsageByRunRow
} from '@/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: Person | null
  company: Company | null
  crawl: Campaign | null
  companyPeople: Person[]
  crawlPeople: Person[]
  crawlRuns: CampaignRun[]
  crawlRunsLoading: boolean
  crawlUsage: { totals: UsageByCampaignRow | null; runs: UsageByRunRow[] } | null
  runningId: string | null
  onSelectPerson: (person: Person) => void
  onSelectCompany: (companyId: string) => void
  onRunCrawl?: (crawlId: string) => void
}

export function DetailDrawer({
  open,
  onOpenChange,
  person,
  company,
  crawl,
  companyPeople,
  crawlPeople,
  crawlRuns,
  crawlRunsLoading,
  crawlUsage,
  runningId,
  onSelectPerson,
  onSelectCompany,
  onRunCrawl
}: Props) {
  if (!person && !company && !crawl) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent />
      </Drawer>
    )
  }

  const kind: 'person' | 'company' | 'crawl' = person
    ? 'person'
    : crawl
      ? 'crawl'
      : 'company'

  const eyebrow = kind === 'person' ? 'Person' : kind === 'crawl' ? 'Crawl' : 'Company'
  const title =
    (kind === 'person' ? person?.fullName : kind === 'crawl' ? crawl?.name : company?.name) ??
    'Details'

  const subtitle =
    kind === 'person' ? (
      person?.title ?? undefined
    ) : kind === 'crawl' ? (
      crawl ? <StatusDot status={crawl.status} /> : undefined
    ) : (
      <span className="font-mono text-[12px]">
        {company?.domain ?? company?.website ?? ''}
      </span>
    )

  const monogram =
    kind === 'person'
      ? (person?.fullName ?? '?').slice(0, 2)
      : kind === 'crawl'
        ? (crawl?.name ?? '?').slice(0, 2)
        : (company?.name ?? '?').slice(0, 2)

  const headerActions =
    kind === 'crawl' && crawl ? (
      <Button
        variant="outline"
        size="sm"
        iconLeft={Play}
        loading={runningId === crawl.id}
        onClick={() => onRunCrawl?.(crawl.id)}
      >
        Run
      </Button>
    ) : null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          monogram={monogram}
          actions={headerActions}
        />

        {kind === 'person' && person ? (
          <PersonView
            person={person}
            company={company}
            onSelectCompany={onSelectCompany}
          />
        ) : null}

        {kind === 'company' && company ? (
          <CompanyView
            company={company}
            people={companyPeople}
            onSelectPerson={onSelectPerson}
          />
        ) : null}

        {kind === 'crawl' && crawl ? (
          <CrawlView
            crawl={crawl}
            runs={crawlRuns}
            runsLoading={crawlRunsLoading}
            people={crawlPeople}
            usage={crawlUsage}
            onSelectPerson={onSelectPerson}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function PersonView({
  person,
  company,
  onSelectCompany
}: {
  person: Person
  company: Company | null
  onSelectCompany: (id: string) => void
}) {
  return (
    <DrawerTabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
      <DrawerTabsList>
        <DrawerTabsTrigger value="overview">Overview</DrawerTabsTrigger>
        <DrawerTabsTrigger value="activity">Activity</DrawerTabsTrigger>
        <DrawerTabsTrigger value="notes">Notes</DrawerTabsTrigger>
      </DrawerTabsList>

      <DrawerTabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody className="space-y-4">
          <SectionCard title="Identity">
            <KV label="Title" value={person.title} />
            <KV label="Department" value={person.department} />
            <KV label="Seniority" value={person.seniority} />
            <KV
              label="Lifecycle"
              value={<StatusDot status={person.lifecycleStatus} />}
            />
          </SectionCard>

          <SectionCard title="Contact">
            <KV label="Email" value={person.email} mono />
            <KV label="Phone" value={person.phone} mono />
            <KV
              label="LinkedIn"
              value={
                person.linkedinUrl ? (
                  <ExternalAnchor href={person.linkedinUrl}>
                    {domainFromUrl(person.linkedinUrl) ?? person.linkedinUrl}
                  </ExternalAnchor>
                ) : null
              }
            />
            <KV
              label="Twitter"
              value={
                person.twitterUrl ? (
                  <ExternalAnchor href={person.twitterUrl}>
                    {domainFromUrl(person.twitterUrl) ?? person.twitterUrl}
                  </ExternalAnchor>
                ) : null
              }
            />
          </SectionCard>

          {company ? (
            <SectionCard title="Company">
              <button
                type="button"
                onClick={() => onSelectCompany(company.id)}
                className="flex w-full items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-muted/60"
              >
                <CompanyFavicon company={company} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{company.name}</div>
                  <div className="truncate font-mono text-[12px] text-ink-muted">
                    {company.domain ?? company.website ?? '-'}
                  </div>
                </div>
                <ExternalLink className="size-3.5 text-ink-faint" />
              </button>
            </SectionCard>
          ) : null}

          {person.icpKeywords?.length ? (
            <SectionCard title="ICP keywords">
              <div className="flex flex-wrap gap-1.5">
                {person.icpKeywords.map((k) => (
                  <Badge key={k} variant="mono">
                    {k}
                  </Badge>
                ))}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Meta">
            <KV label="Last seen" value={formatDate(person.lastSeenAt)} />
            <KV label="Created" value={formatDate(person.createdAt)} />
            <KV label="Updated" value={formatDate(person.updatedAt)} />
          </SectionCard>
        </DrawerBody>
      </DrawerTabsContent>

      <DrawerTabsContent value="activity" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody>
          <EmptyTab title="No activity yet" description="Outreach history will appear here once campaigns send drafts." />
        </DrawerBody>
      </DrawerTabsContent>

      <DrawerTabsContent value="notes" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody className="space-y-4">
          <SectionCard title="Context">
            <p className="whitespace-pre-wrap text-sm text-ink">
              {person.context ?? <span className="text-ink-faint">No context yet.</span>}
            </p>
          </SectionCard>
          <SectionCard title="Notes">
            <p className="whitespace-pre-wrap text-sm text-ink">
              {person.notes ?? <span className="text-ink-faint">No notes yet.</span>}
            </p>
          </SectionCard>
        </DrawerBody>
      </DrawerTabsContent>
    </DrawerTabs>
  )
}

function CompanyView({
  company,
  people,
  onSelectPerson
}: {
  company: Company
  people: Person[]
  onSelectPerson: (person: Person) => void
}) {
  return (
    <DrawerTabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
      <DrawerTabsList>
        <DrawerTabsTrigger value="overview">Overview</DrawerTabsTrigger>
        <DrawerTabsTrigger value="people">
          People{' '}
          <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
            {people.length}
          </span>
        </DrawerTabsTrigger>
      </DrawerTabsList>

      <DrawerTabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody className="space-y-4">
          <SectionCard title="Profile">
            <KV label="Domain" value={company.domain} mono />
            <KV
              label="Website"
              value={
                company.website ? (
                  <ExternalAnchor href={company.website}>{company.website}</ExternalAnchor>
                ) : null
              }
            />
            <KV label="Industry" value={company.industry} />
            <KV
              label="HQ"
              value={
                company.hqLocation ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3 text-ink-faint" />
                    {company.hqLocation}
                  </span>
                ) : null
              }
            />
            <KV label="Employees" value={company.employeeRange} mono />
          </SectionCard>
          <SectionCard title="Meta">
            <KV label="Created" value={formatDate(company.createdAt)} />
            <KV label="Updated" value={formatDate(company.updatedAt)} />
          </SectionCard>
        </DrawerBody>
      </DrawerTabsContent>

      <DrawerTabsContent value="people" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody>
          {people.length === 0 ? (
            <EmptyTab
              title="No people yet"
              description="Researched contacts at this company will appear here."
            />
          ) : (
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
                    <div className="truncate text-xs text-ink-muted">{p.title ?? '-'}</div>
                  </div>
                  <StatusDot status={p.lifecycleStatus} />
                </button>
              ))}
            </div>
          )}
        </DrawerBody>
      </DrawerTabsContent>
    </DrawerTabs>
  )
}

function CrawlView({
  crawl,
  runs,
  runsLoading,
  people,
  usage,
  onSelectPerson
}: {
  crawl: Campaign
  runs: CampaignRun[]
  runsLoading: boolean
  people: Person[]
  usage: { totals: UsageByCampaignRow | null; runs: UsageByRunRow[] } | null
  onSelectPerson: (person: Person) => void
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
                  key={run.id}
                />
              ))}
            </div>
          )}
        </DrawerBody>
      </DrawerTabsContent>

      <DrawerTabsContent value="people" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody>
          {people.length === 0 ? (
            <EmptyTab
              title="No people yet"
              description="People discovered by this crawl will appear here once a run completes."
            />
          ) : (
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
          )}
        </DrawerBody>
      </DrawerTabsContent>
    </DrawerTabs>
  )
}

function RunRow({
  run,
  index,
  usage
}: {
  run: CampaignRun
  index: number
  usage: UsageByRunRow | null
}) {
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
        <span className="text-xs text-ink-muted">
          {formatRelative(run.createdAt) ?? '-'}
        </span>
      </header>
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-3">
          <Stat
            label="Qualified"
            value={
              <span className="font-mono tabular text-sm text-ink">
                {run.qualifiedCount}
              </span>
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
      </div>
    </article>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs uppercase tracking-wide text-ink-faint">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="border-b border-line bg-surface px-4 py-2 text-2xs font-medium uppercase tracking-wide text-ink-faint">
        {title}
      </header>
      <div className="px-4 py-2">{children}</div>
    </section>
  )
}

function KV({
  label,
  value,
  mono
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  if (value === null || value === undefined || value === '') {
    return (
      <div className="grid grid-cols-[100px_1fr] gap-3 border-b border-line py-2 last:border-b-0">
        <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
        <dd className="text-sm text-ink-faint">-</dd>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[100px_1fr] items-start gap-3 border-b border-line py-2 last:border-b-0">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd
        className={cn(
          'min-w-0 text-sm text-ink',
          mono && 'font-mono text-[12.5px] text-ink-muted'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function ExternalAnchor({
  href,
  children
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 underline-offset-4 hover:text-accent hover:underline"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  )
}

function CompanyFavicon({ company }: { company: Company }) {
  const fav = faviconUrl(company.domain ?? company.website)
  if (!fav) {
    return (
      <span className="grid size-8 place-items-center rounded-md border border-line bg-surface-muted">
        <Globe className="size-4 text-ink-faint" />
      </span>
    )
  }
  return (
    <img
      src={fav}
      alt=""
      className="size-8 rounded-md border border-line"
      onError={(e) => ((e.currentTarget.style.visibility = 'hidden'))}
    />
  )
}

function EmptyTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-xs text-sm text-ink-muted">{description}</p>
    </div>
  )
}
