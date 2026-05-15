import { MapPin } from 'lucide-react'

import type { Company, Mailbox, Person } from '@/api'
import { Avatar } from '@/components/ui/avatar'
import { DrawerBody, DrawerTabs, DrawerTabsContent, DrawerTabsList, DrawerTabsTrigger } from '@/components/ui/drawer'
import { StatusDot } from '@/components/ui/status-dot'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

import { EmptyTab, ExternalAnchor, KV, SectionCard } from './drawer-ui'
import { OutreachPanel } from './OutreachPanel'

export function CompanyView({
  company,
  people,
  peopleLoading,
  mailboxes,
  onSelectPerson,
  onCompanyChanged,
  onError
}: {
  company: Company
  people: Person[]
  peopleLoading: boolean
  mailboxes: Mailbox[]
  onSelectPerson: (person: Person) => void
  onCompanyChanged?: () => void
  onError?: (msg: string) => void
}) {
  return (
    <DrawerTabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
      <DrawerTabsList>
        <DrawerTabsTrigger value="outreach">Outreach</DrawerTabsTrigger>
        <DrawerTabsTrigger value="overview">Overview</DrawerTabsTrigger>
        <DrawerTabsTrigger value="people">
          People{' '}
          <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
            {peopleLoading ? '…' : people.length}
          </span>
        </DrawerTabsTrigger>
      </DrawerTabsList>

      <DrawerTabsContent value="outreach" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody className="space-y-4">
          <OutreachPanel
            company={company}
            mailboxes={mailboxes}
            onCompanyChanged={onCompanyChanged}
            onError={onError}
          />
        </DrawerBody>
      </DrawerTabsContent>

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
            <KV label="Notes" value={company.notes} />
          </SectionCard>
          <SectionCard title="Meta">
            <KV label="Created" value={formatDate(company.createdAt)} />
            <KV label="Updated" value={formatDate(company.updatedAt)} />
          </SectionCard>
        </DrawerBody>
      </DrawerTabsContent>

      <DrawerTabsContent value="people" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody>
          {peopleLoading ? (
            <div className="py-10 text-center text-sm text-ink-muted">Loading contacts…</div>
          ) : people.length === 0 ? (
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
