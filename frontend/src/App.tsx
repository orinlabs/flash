import {
  Building2,
  Loader2,
  Mail,
  Play,
  RefreshCw,
  Search,
  Users,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  apiGet,
  apiPost,
  type Campaign,
  type Company,
  type Person
} from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

type TabId = 'people' | 'companies' | 'crawls' | 'campaigns'
type DetailSelection = { type: 'person'; id: string } | { type: 'company'; id: string }
type PagedResponse<T> = { data: T[]; limit: number; offset: number }

const PAGE_SIZE = 100

const navItems: Array<{ id: TabId; label: string; description: string; icon: typeof Users }> = [
  {
    id: 'people',
    label: 'People',
    description: 'Prospects discovered from crawls.',
    icon: Users
  },
  {
    id: 'companies',
    label: 'Companies',
    description: 'Accounts found during research.',
    icon: Building2
  },
  {
    id: 'crawls',
    label: 'Crawls',
    description: 'ICP research jobs and workflow runs.',
    icon: Search
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    description: 'Email campaigns and drafts.',
    icon: Mail
  }
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('people')
  const [crawls, setCrawls] = useState<Campaign[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [detail, setDetail] = useState<DetailSelection | null>(null)
  const [peopleHasMore, setPeopleHasMore] = useState(true)
  const [companiesHasMore, setCompaniesHasMore] = useState(true)
  const [crawlsLoading, setCrawlsLoading] = useState(true)
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  const [name, setName] = useState('My ICP run')
  const [icpDocument, setIcpDocument] = useState(
    'Describe your ideal customer profile here.'
  )
  const [targetCount, setTargetCount] = useState(10)

  const loadCrawls = useCallback(async () => {
    setError(null)
    const data = await apiGet<Campaign[]>('/campaigns')
    setCrawls(data)
  }, [])

  const loadPeople = useCallback(async (offset = 0) => {
    setPeopleLoading(true)
    setError(null)
    try {
      const res = await apiGet<PagedResponse<Person>>(`/people?limit=${PAGE_SIZE}&offset=${offset}`)
      setPeople((current) => (offset === 0 ? res.data : [...current, ...res.data]))
      setPeopleHasMore(res.data.length === PAGE_SIZE)
    } finally {
      setPeopleLoading(false)
    }
  }, [])

  const loadCompanies = useCallback(async (offset = 0) => {
    setCompaniesLoading(true)
    setError(null)
    try {
      const res = await apiGet<PagedResponse<Company>>(`/companies?limit=${PAGE_SIZE}&offset=${offset}`)
      setCompanies((current) => (offset === 0 ? res.data : [...current, ...res.data]))
      setCompaniesHasMore(res.data.length === PAGE_SIZE)
    } finally {
      setCompaniesLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setCrawlsLoading(true)
      try {
        await loadCrawls()
        await loadCompanies()
        await loadPeople()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load data')
        }
      } finally {
        if (!cancelled) setCrawlsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadCompanies, loadCrawls, loadPeople])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await apiPost<Campaign>('/campaigns', {
        name,
        icpDocument,
        targetCount
      })
      await loadCrawls()
      setActiveTab('crawls')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create crawl failed')
    } finally {
      setCreating(false)
    }
  }

  async function startRun(crawlId: string) {
    setRunningId(crawlId)
    setError(null)
    try {
      await apiPost<{ workflowTriggered: boolean }>('/campaigns/' + crawlId + '/runs')
      await loadCrawls()
      await loadPeople(0)
      await loadCompanies(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start crawl failed')
    } finally {
      setRunningId(null)
    }
  }

  const activeNav = navItems.find((item) => item.id === activeTab) ?? navItems[0]
  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies])
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people])
  const selectedPerson = detail?.type === 'person' ? personById.get(detail.id) ?? null : null
  const selectedCompany = detail?.type === 'company' ? companyById.get(detail.id) ?? null : null
  const selectedCompanyPeople = selectedCompany
    ? people.filter((person) => person.companyId === selectedCompany.id)
    : selectedPerson?.companyId
      ? people.filter((person) => person.companyId === selectedPerson.companyId)
      : []

  function loadMorePeople() {
    if (!peopleLoading && peopleHasMore) {
      void loadPeople(people.length)
    }
  }

  function loadMoreCompanies() {
    if (!companiesLoading && companiesHasMore) {
      void loadCompanies(companies.length)
    }
  }

  return (
    <div className="h-svh overflow-hidden bg-muted/20 text-left">
      <div className="grid h-svh overflow-hidden md:grid-cols-[260px_1fr]">
        <aside className="h-svh overflow-y-auto border-r bg-background p-4">
          <div className="mb-6 px-2">
            <h1 className="text-xl font-semibold tracking-tight">ICP Prospector</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Research crawls now. Email campaigns next.
            </p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const selected = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={[
                    'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  ].join(' ')}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span
                      className={[
                        'block text-xs',
                        selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      ].join(' ')}
                    >
                      {item.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <main className="flex h-svh min-w-0 flex-col overflow-hidden">
          <header className="shrink-0 border-b bg-background p-6">
            <h2 className="text-2xl font-semibold tracking-tight">{activeNav.label}</h2>
            <p className="text-muted-foreground text-sm">{activeNav.description}</p>
          </header>

          {error ? (
            <Card className="m-6 shrink-0 border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-destructive text-base">Error</CardTitle>
                <CardDescription className="text-destructive/90">{error}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {activeTab === 'people' ? (
            <PeoplePage
              people={people}
              companyById={companyById}
              loading={peopleLoading}
              hasMore={peopleHasMore}
              onRefresh={() => void loadPeople(0)}
              onLoadMore={loadMorePeople}
              onSelectPerson={(person) => setDetail({ type: 'person', id: person.id })}
              onSelectCompany={(companyId) => setDetail({ type: 'company', id: companyId })}
            />
          ) : null}

          {activeTab === 'companies' ? (
            <CompaniesPage
              companies={companies}
              people={people}
              loading={companiesLoading}
              hasMore={companiesHasMore}
              onRefresh={() => void loadCompanies(0)}
              onLoadMore={loadMoreCompanies}
              onSelectCompany={(company) => setDetail({ type: 'company', id: company.id })}
            />
          ) : null}

          {activeTab === 'crawls' ? (
            <CrawlsPage
              crawls={crawls}
              crawlsLoading={crawlsLoading}
              creating={creating}
              runningId={runningId}
              name={name}
              icpDocument={icpDocument}
              targetCount={targetCount}
              onNameChange={setName}
              onIcpDocumentChange={setIcpDocument}
              onTargetCountChange={setTargetCount}
              onCreate={handleCreate}
              onRun={startRun}
              onRefresh={() => void loadCrawls()}
            />
          ) : null}

          {activeTab === 'campaigns' ? <CampaignsPage /> : null}
        </main>
      </div>
      <DetailDrawer
        person={selectedPerson}
        company={selectedCompany ?? (selectedPerson?.companyId ? companyById.get(selectedPerson.companyId) ?? null : null)}
        companyPeople={selectedCompanyPeople}
        onClose={() => setDetail(null)}
        onSelectPerson={(person) => setDetail({ type: 'person', id: person.id })}
        onSelectCompany={(companyId) => setDetail({ type: 'company', id: companyId })}
      />
    </div>
  )
}

function PeoplePage({
  people,
  companyById,
  loading,
  hasMore,
  onRefresh,
  onLoadMore,
  onSelectPerson,
  onSelectCompany
}: {
  people: Person[]
  companyById: Map<string, Company>
  loading: boolean
  hasMore: boolean
  onRefresh: () => void
  onLoadMore: () => void
  onSelectPerson: (person: Person) => void
  onSelectCompany: (companyId: string) => void
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex shrink-0 flex-row items-center justify-between border-b p-4">
        <div>
          <h3 className="font-semibold">People</h3>
          <p className="text-muted-foreground text-sm">Prospects discovered by crawls.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto" onScroll={(event) => handleInfiniteScroll(event, onLoadMore)}>
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 bg-background">Name</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Company</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Title</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Email</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">LinkedIn</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                  No people yet. Start a crawl to populate this table.
                </TableCell>
              </TableRow>
            ) : (
              people.map((person) => (
                <TableRow
                  key={person.id}
                  className="cursor-pointer"
                  onClick={() => onSelectPerson(person)}
                >
                  <TableCell className="font-medium">{person.fullName ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {person.companyId && companyById.get(person.companyId) ? (
                      <button
                        type="button"
                        className="text-left underline"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectCompany(person.companyId as string)
                        }}
                      >
                        {companyById.get(person.companyId)?.name}
                      </button>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {person.title ?? '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {person.email ?? '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {person.linkedinUrl ? (
                      <a className="underline" href={person.linkedinUrl} target="_blank" rel="noreferrer">
                        Profile
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{person.lifecycleStatus}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TableFooterState loading={loading} hasMore={hasMore} />
      </div>
    </section>
  )
}

function CompaniesPage({
  companies,
  people,
  loading,
  hasMore,
  onRefresh,
  onLoadMore,
  onSelectCompany
}: {
  companies: Company[]
  people: Person[]
  loading: boolean
  hasMore: boolean
  onRefresh: () => void
  onLoadMore: () => void
  onSelectCompany: (company: Company) => void
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex shrink-0 flex-row items-center justify-between border-b p-4">
        <div>
          <h3 className="font-semibold">Companies</h3>
          <p className="text-muted-foreground text-sm">Accounts discovered during research.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto" onScroll={(event) => handleInfiniteScroll(event, onLoadMore)}>
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky top-0 z-10 bg-background">Name</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Domain</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">Industry</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">HQ</TableHead>
              <TableHead className="sticky top-0 z-10 bg-background">People</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                  No companies yet.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer"
                  onClick={() => onSelectCompany(company)}
                >
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {company.website ? (
                      <a className="underline" href={company.website} target="_blank" rel="noreferrer">
                        {company.domain ?? company.website}
                      </a>
                    ) : (
                      company.domain ?? '-'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {company.industry ?? '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {company.hqLocation ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {people.filter((person) => person.companyId === company.id).length}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TableFooterState loading={loading} hasMore={hasMore} />
      </div>
    </section>
  )
}

function handleInfiniteScroll(event: React.UIEvent<HTMLDivElement>, onLoadMore: () => void) {
  const target = event.currentTarget
  const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight
  if (distanceFromBottom < 240) {
    onLoadMore()
  }
}

function TableFooterState({ loading, hasMore }: { loading: boolean; hasMore: boolean }) {
  return (
    <div className="text-muted-foreground border-t bg-background p-3 text-center text-sm">
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </span>
      ) : hasMore ? (
        'Scroll for more'
      ) : (
        'End of results'
      )}
    </div>
  )
}

function CrawlsPage({
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
  onRefresh
}: {
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
}) {
  return (
    <div className="h-full space-y-6 overflow-y-auto p-6">
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>New crawl</CardTitle>
          <CardDescription>
            Describe an ICP and start a Render Workflow research crawl.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icp">ICP document</Label>
              <Textarea
                id="icp"
                value={icpDocument}
                onChange={(e) => onIcpDocumentChange(e.target.value)}
                rows={5}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Target count</Label>
              <Input
                id="target"
                type="number"
                min={1}
                value={targetCount}
                onChange={(e) => onTargetCountChange(Number(e.target.value))}
                required
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create crawl'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Crawls</CardTitle>
            <CardDescription>Start or inspect ICP research workflow runs.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={crawlsLoading}>
            {crawlsLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crawlsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm">
                    <Loader2 className="mx-auto animate-spin" />
                  </TableCell>
                </TableRow>
              ) : crawls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center text-sm">
                    No crawls yet.
                  </TableCell>
                </TableRow>
              ) : (
                crawls.map((crawl) => (
                  <TableRow key={crawl.id}>
                    <TableCell className="font-medium">{crawl.name}</TableCell>
                    <TableCell>{crawl.targetCount}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{crawl.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={runningId === crawl.id}
                        onClick={() => onRun(crawl.id)}
                      >
                        {runningId === crawl.id ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Play />
                        )}
                        <span className="ml-1">Run</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function CampaignsPage() {
  return (
    <Card className="m-6 rounded-none">
      <CardHeader>
        <CardTitle>Email campaigns</CardTitle>
        <CardDescription>
          This will become the workspace for selecting people, generating drafts, and tracking outreach.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Mail className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
          <h3 className="font-medium">No email campaigns yet</h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Crawls feed the people and company database. Campaigns will use those records for Gmail draft
            generation and outreach review.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailDrawer({
  person,
  company,
  companyPeople,
  onClose,
  onSelectPerson,
  onSelectCompany
}: {
  person: Person | null
  company: Company | null
  companyPeople: Person[]
  onClose: () => void
  onSelectPerson: (person: Person) => void
  onSelectCompany: (companyId: string) => void
}) {
  if (!person && !company) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto border-l bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              {person ? 'Person' : 'Company'}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {person?.fullName ?? company?.name ?? 'Details'}
            </h2>
            {person?.title ? (
              <p className="text-muted-foreground mt-1 text-sm">{person.title}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        {person ? (
          <PersonDetails
            person={person}
            company={company}
            onSelectCompany={onSelectCompany}
          />
        ) : null}

        {company ? (
          <CompanyDetails
            company={company}
            people={companyPeople}
            onSelectPerson={onSelectPerson}
          />
        ) : null}
      </aside>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0">
      <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

function PersonDetails({
  person,
  company,
  onSelectCompany
}: {
  person: Person
  company: Company | null
  onSelectCompany: (companyId: string) => void
}) {
  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Person details</CardTitle>
          <CardDescription>Full researched profile from the crawl.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <DetailRow
              label="Company"
              value={
                company && person.companyId ? (
                  <button
                    type="button"
                    className="font-medium underline"
                    onClick={() => onSelectCompany(person.companyId as string)}
                  >
                    {company.name}
                  </button>
                ) : (
                  '-'
                )
              }
            />
            <DetailRow label="Seniority" value={person.seniority} />
            <DetailRow label="Department" value={person.department} />
            <DetailRow label="Email" value={person.email} />
            <DetailRow label="Phone" value={person.phone} />
            <DetailRow
              label="LinkedIn"
              value={
                person.linkedinUrl ? (
                  <a className="underline" href={person.linkedinUrl} target="_blank" rel="noreferrer">
                    {person.linkedinUrl}
                  </a>
                ) : null
              }
            />
            <DetailRow
              label="Twitter / X"
              value={
                person.twitterUrl ? (
                  <a className="underline" href={person.twitterUrl} target="_blank" rel="noreferrer">
                    {person.twitterUrl}
                  </a>
                ) : null
              }
            />
            <DetailRow label="Lifecycle" value={<Badge variant="secondary">{person.lifecycleStatus}</Badge>} />
            <DetailRow label="Context" value={person.context} />
            <DetailRow label="Notes" value={<p className="whitespace-pre-wrap">{person.notes}</p>} />
            <DetailRow
              label="ICP keywords"
              value={
                person.icpKeywords?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {person.icpKeywords.map((keyword) => (
                      <Badge key={keyword} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                ) : null
              }
            />
            <DetailRow label="Last seen" value={formatDate(person.lastSeenAt)} />
            <DetailRow label="Created" value={formatDate(person.createdAt)} />
          </dl>
        </CardContent>
      </Card>
    </section>
  )
}

function CompanyDetails({
  company,
  people,
  onSelectPerson
}: {
  company: Company
  people: Person[]
  onSelectPerson: (person: Person) => void
}) {
  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>Account metadata from crawls.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <DetailRow label="Domain" value={company.domain} />
            <DetailRow
              label="Website"
              value={
                company.website ? (
                  <a className="underline" href={company.website} target="_blank" rel="noreferrer">
                    {company.website}
                  </a>
                ) : null
              }
            />
            <DetailRow label="Industry" value={company.industry} />
            <DetailRow label="Employee range" value={company.employeeRange} />
            <DetailRow label="HQ location" value={company.hqLocation} />
            <DetailRow label="Created" value={formatDate(company.createdAt)} />
            <DetailRow label="Updated" value={formatDate(company.updatedAt)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Researched people at this company</CardTitle>
          <CardDescription>
            {people.length} {people.length === 1 ? 'person' : 'people'} linked to {company.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {people.length === 0 ? (
            <p className="text-muted-foreground text-sm">No researched people linked yet.</p>
          ) : (
            <div className="space-y-2">
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="hover:bg-muted flex w-full items-start justify-between rounded-lg border p-3 text-left"
                  onClick={() => onSelectPerson(person)}
                >
                  <span>
                    <span className="block font-medium">{person.fullName ?? 'Unnamed person'}</span>
                    <span className="text-muted-foreground block text-sm">{person.title ?? 'No title'}</span>
                  </span>
                  <Badge variant="secondary">{person.lifecycleStatus}</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  return new Date(value).toLocaleString()
}
