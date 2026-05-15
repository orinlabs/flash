import {
  Building2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Users
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  apiGet,
  apiPost,
  type Campaign,
  type Company,
  type Person
} from '@/api'
import { AppShell } from '@/components/layout/AppShell'
import type { SidebarSection } from '@/components/layout/Sidebar'
import { PageHeader } from '@/components/layout/PageHeader'
import { Banner } from '@/components/ui/banner'
import { Button } from '@/components/ui/button'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { CompaniesPage } from '@/pages/CompaniesPage'
import { CrawlsPage } from '@/pages/CrawlsPage'
import { DetailDrawer } from '@/pages/DetailDrawer'
import { PeoplePage } from '@/pages/PeoplePage'

type TabId = 'people' | 'companies' | 'crawls' | 'campaigns'
type DetailSelection =
  | { type: 'person'; id: string }
  | { type: 'company'; id: string }
type PagedResponse<T> = { data: T[]; limit: number; offset: number }

const PAGE_SIZE = 100

const sections: SidebarSection<TabId>[] = [
  {
    label: 'Pipeline',
    items: [
      { id: 'people', label: 'People', icon: Users },
      { id: 'companies', label: 'Companies', icon: Building2 }
    ]
  },
  {
    label: 'Workflows',
    items: [
      { id: 'crawls', label: 'Crawls', icon: Search },
      { id: 'campaigns', label: 'Campaigns', icon: Mail }
    ]
  }
]

const headerCopy: Record<TabId, { title: string; description: string }> = {
  people: { title: 'People', description: 'Prospects discovered from crawls.' },
  companies: { title: 'Companies', description: 'Accounts found during research.' },
  crawls: { title: 'Crawls', description: 'ICP research jobs and workflow runs.' },
  campaigns: { title: 'Campaigns', description: 'Email campaigns and drafts.' }
}

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
      const res = await apiGet<PagedResponse<Person>>(
        `/people?limit=${PAGE_SIZE}&offset=${offset}`
      )
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
      const res = await apiGet<PagedResponse<Company>>(
        `/companies?limit=${PAGE_SIZE}&offset=${offset}`
      )
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
      await apiPost<Campaign>('/campaigns', { name, icpDocument, targetCount })
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
      await apiPost<{ workflowTriggered: boolean }>(
        '/campaigns/' + crawlId + '/runs'
      )
      await loadCrawls()
      await loadPeople(0)
      await loadCompanies(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Start crawl failed')
    } finally {
      setRunningId(null)
    }
  }

  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  )
  const personById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people]
  )

  const selectedPerson =
    detail?.type === 'person' ? (personById.get(detail.id) ?? null) : null
  const selectedCompanyDirect =
    detail?.type === 'company' ? (companyById.get(detail.id) ?? null) : null
  const selectedCompany =
    selectedCompanyDirect ??
    (selectedPerson?.companyId ? (companyById.get(selectedPerson.companyId) ?? null) : null)
  const selectedCompanyPeople = selectedCompanyDirect
    ? people.filter((p) => p.companyId === selectedCompanyDirect.id)
    : selectedPerson?.companyId
      ? people.filter((p) => p.companyId === selectedPerson.companyId)
      : []

  function loadMorePeople() {
    if (!peopleLoading && peopleHasMore) void loadPeople(people.length)
  }

  function loadMoreCompanies() {
    if (!companiesLoading && companiesHasMore) void loadCompanies(companies.length)
  }

  const header = headerCopy[activeTab]
  const drawerOpen = detail !== null
  const selectedKey = detail?.id ?? null

  const headerActions = (() => {
    switch (activeTab) {
      case 'people':
        return (
          <>
            <Button
              variant="outline"
              size="md"
              iconLeft={RefreshCw}
              onClick={() => void loadPeople(0)}
              loading={peopleLoading && people.length > 0}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              iconLeft={Plus}
              onClick={() => setActiveTab('crawls')}
            >
              New crawl
            </Button>
          </>
        )
      case 'companies':
        return (
          <Button
            variant="outline"
            size="md"
            iconLeft={RefreshCw}
            onClick={() => void loadCompanies(0)}
            loading={companiesLoading && companies.length > 0}
          >
            Refresh
          </Button>
        )
      case 'crawls':
        return (
          <Button
            variant="outline"
            size="md"
            iconLeft={RefreshCw}
            onClick={() => void loadCrawls()}
            loading={crawlsLoading && crawls.length > 0}
          >
            Refresh
          </Button>
        )
      case 'campaigns':
        return (
          <Button variant="primary" size="md" iconLeft={Plus} disabled>
            New campaign
          </Button>
        )
    }
  })()

  return (
    <AppShell
      sections={sections}
      activeId={activeTab}
      onSelect={setActiveTab}
      sidebarFooter={
        <div className="text-2xs leading-relaxed text-ink-faint">
          <div className="font-medium text-ink-muted">v0.1 - preview</div>
          <div>Crawls now. Outreach next.</div>
        </div>
      }
    >
      <PageHeader
        title={header.title}
        description={header.description}
        actions={headerActions}
      />

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
          selectedKey={selectedKey}
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
          selectedKey={selectedKey}
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

      {activeTab === 'campaigns' ? (
        <CampaignsPage onGoToCrawls={() => setActiveTab('crawls')} />
      ) : null}

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
        person={selectedPerson}
        company={selectedCompany}
        companyPeople={selectedCompanyPeople}
        onSelectPerson={(person) => setDetail({ type: 'person', id: person.id })}
        onSelectCompany={(companyId) => setDetail({ type: 'company', id: companyId })}
      />
    </AppShell>
  )
}
