import { Play } from 'lucide-react'
import {
  type Campaign,
  type CampaignRun,
  type Company,
  type Mailbox,
  type Person,
  type UsageByCampaignRow,
  type UsageByRunRow
} from '@/api'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
} from '@/components/ui/drawer'
import { StatusDot } from '@/components/ui/status-dot'
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  person: Person | null
  company: Company | null
  crawl: Campaign | null
  companyPeople: Person[]
  companyPeopleLoading?: boolean
  crawlPeople: Person[]
  crawlPeopleLoading?: boolean
  crawlRuns: CampaignRun[]
  crawlRunsLoading: boolean
  crawlUsage: { totals: UsageByCampaignRow | null; runs: UsageByRunRow[] } | null
  runningId: string | null
  mailboxes: Mailbox[]
  onSelectPerson: (person: Person) => void
  onSelectCompany: (companyId: string) => void
  onRunCrawl?: (crawlId: string) => void
  onViewPeopleForCrawl?: (crawlId: string, campaignRunId?: string | null) => void
  onCompanyChanged?: () => void
  onError?: (msg: string) => void
}

export function DetailDrawer({
  open,
  onOpenChange,
  person,
  company,
  crawl,
  companyPeople,
  companyPeopleLoading = false,
  crawlPeople,
  crawlPeopleLoading = false,
  crawlRuns,
  crawlRunsLoading,
  crawlUsage,
  runningId,
  mailboxes,
  onSelectPerson,
  onSelectCompany,
  onRunCrawl,
  onViewPeopleForCrawl,
  onCompanyChanged,
  onError
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
            peopleLoading={companyPeopleLoading}
            mailboxes={mailboxes}
            onSelectPerson={onSelectPerson}
            onCompanyChanged={onCompanyChanged}
            onError={onError}
          />
        ) : null}

        {kind === 'crawl' && crawl ? (
          <CrawlView
            crawl={crawl}
            runs={crawlRuns}
            runsLoading={crawlRunsLoading}
            people={crawlPeople}
            peopleLoading={crawlPeopleLoading}
            usage={crawlUsage}
            onSelectPerson={onSelectPerson}
            onViewPeopleForCrawl={onViewPeopleForCrawl}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
import { CompanyView } from './CompanyView'
import { CrawlView } from './CrawlView'
import { PersonView } from './PersonView'

