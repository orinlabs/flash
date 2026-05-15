import { ExternalLink, Globe, MapPin } from 'lucide-react'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { StatusDot } from '@/components/ui/status-dot'
import { domainFromUrl, faviconUrl, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Company, Person } from '@/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: Person | null
  company: Company | null
  companyPeople: Person[]
  onSelectPerson: (person: Person) => void
  onSelectCompany: (companyId: string) => void
}

export function DetailDrawer({
  open,
  onOpenChange,
  person,
  company,
  companyPeople,
  onSelectPerson,
  onSelectCompany
}: Props) {
  if (!person && !company) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent />
      </Drawer>
    )
  }

  const isPerson = !!person

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader
          eyebrow={isPerson ? 'Person' : 'Company'}
          title={(isPerson ? person?.fullName : company?.name) ?? 'Details'}
          subtitle={
            isPerson ? (
              person?.title ?? undefined
            ) : (
              <span className="font-mono text-[12px]">
                {company?.domain ?? company?.website ?? ''}
              </span>
            )
          }
          monogram={
            isPerson
              ? (person?.fullName ?? '?').slice(0, 2)
              : (company?.name ?? '?').slice(0, 2)
          }
        />

        {isPerson && person ? (
          <PersonView
            person={person}
            company={company}
            onSelectCompany={onSelectCompany}
          />
        ) : null}

        {!isPerson && company ? (
          <CompanyView
            company={company}
            people={companyPeople}
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
