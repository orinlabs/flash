import { ExternalLink } from 'lucide-react'

import type { Company, Person } from '@/api'
import { Badge } from '@/components/ui/badge'
import { DrawerBody, DrawerTabs, DrawerTabsContent, DrawerTabsList, DrawerTabsTrigger } from '@/components/ui/drawer'
import { StatusDot } from '@/components/ui/status-dot'
import { domainFromUrl, formatDate } from '@/lib/format'

import { CompanyFavicon, EmptyTab, ExternalAnchor, KV, SectionCard } from './drawer-ui'

export function PersonView({
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
