import {
  Activity,
  Building2,
  Inbox,
  Mail,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom'

import {
  AgenticSearchModal,
  type AgenticSearchTarget
} from '@/components/AgenticSearchModal'
import {
  apiAuthMe,
  apiGet,
  apiPost,
  setUnauthorizedHandler,
  type AuthUser,
  type Campaign,
  type CampaignRun,
  type Company,
  type DraftQueueRow,
  type Mailbox,
  type Person,
  type UsageByCampaignRow,
  type UsageByRunRow
} from '@/api'
import { CommandPalette, type CommandItem } from '@/components/CommandPalette'
import { AppShell } from '@/components/layout/AppShell'
import type { SidebarSection } from '@/components/layout/Sidebar'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Banner } from '@/components/ui/banner'
import { Button } from '@/components/ui/button'
import { CampaignsPage } from '@/pages/CampaignsPage'
import { CompaniesPage } from '@/pages/CompaniesPage'
import { CrawlsPage } from '@/pages/CrawlsPage'
import { DetailDrawer } from '@/pages/DetailDrawer'
import { DraftsPage } from '@/pages/DraftsPage'
import { MailboxesPage } from '@/pages/MailboxesPage'
import { PeoplePage } from '@/pages/PeoplePage'
import { LoginPage } from '@/pages/LoginPage'
import { UsagePage } from '@/pages/UsagePage'
import { emailToInitials } from '@/lib/userDisplay'

type TabId =
  | 'people'
  | 'companies'
  | 'crawls'
  | 'campaigns'
  | 'drafts'
  | 'mailboxes'
  | 'usage'
type DetailSelection =
  | { type: 'person'; id: string }
  | { type: 'company'; id: string }
  | { type: 'crawl'; id: string }
type PagedResponse<T> = { data: T[]; limit: number; offset: number }
type AgenticPeopleSearchResponse = {
  selectedPersonIds: string[]
  errors: Array<{ personId: string; error: string }>
}
type AgenticCompanySearchResponse = {
  selectedCompanyIds: string[]
  errors: Array<{ companyId: string; error: string }>
}

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
      { id: 'campaigns', label: 'Campaigns', icon: Mail },
      { id: 'drafts', label: 'Drafts', icon: Inbox }
    ]
  },
  {
    label: 'Operations',
    items: [
      { id: 'mailboxes', label: 'Mailboxes', icon: Plug },
      { id: 'usage', label: 'Usage', icon: Activity }
    ]
  }
]

const headerCopy: Record<TabId, { title: string; description: string }> = {
  people: { title: 'People', description: 'Prospects discovered from crawls.' },
  companies: { title: 'Companies', description: 'Accounts found during research.' },
  crawls: { title: 'Crawls', description: 'ICP research jobs and workflow runs.' },
  campaigns: {
    title: 'Campaigns',
    description: 'Accounts the outreach agent is currently working.'
  },
  drafts: {
    title: 'Drafts',
    description: 'Daily review queue. Approve to send, discard, or regenerate.'
  },
  mailboxes: {
    title: 'Mailboxes',
    description: 'Connect Gmail accounts the agent can send from on your approval.'
  },
  usage: {
    title: 'Usage',
    description: 'Spend, tokens, and call volume across crawls and accounts.'
  }
}

const TAB_IDS: TabId[] = [
  'people',
  'companies',
  'crawls',
  'campaigns',
  'drafts',
  'mailboxes',
  'usage'
]

function isTabId(value: string | undefined): value is TabId {
  return value !== undefined && (TAB_IDS as readonly string[]).includes(value)
}

function parseDetailFromSearch(search: URLSearchParams): DetailSelection | null {
  const kind = search.get('kind')
  const id = search.get('id')
  if (!kind || !id) return null
  if (kind === 'person' || kind === 'company' || kind === 'crawl') {
    return { type: kind, id }
  }
  return null
}

function collectSearchValues(value: unknown, depth = 0): string[] {
  if (value === null || value === undefined || depth > 3) return []
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)]
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSearchValues(item, depth + 1))
  }
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => [
      key,
      ...collectSearchValues(item, depth + 1)
    ])
  }
  return []
}

function NavigateToLogin() {
  const loc = useLocation()
  const target = loc.pathname + (loc.search || '')
  return <Navigate to="/login" replace state={{ from: target || '/' }} />
}

function HomeRoute({ authUser }: { authUser: AuthUser | null }) {
  if (authUser) return <Navigate to="/people" replace />
  return <Navigate to="/login" replace state={{ from: '/' }} />
}

function FlashApp({
  authUser,
  setAuthUser
}: {
  authUser: AuthUser
  setAuthUser: React.Dispatch<React.SetStateAction<AuthUser | null>>
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { tab: tabParam } = useParams<{ tab: string }>()
  const tabValid = isTabId(tabParam)
  const activeTab: TabId = tabValid ? tabParam : 'people'

  const detail = useMemo(
    () => parseDetailFromSearch(new URLSearchParams(location.search)),
    [location.search]
  )

  const openDetail = useCallback(
    (sel: DetailSelection | null) => {
      if (!sel) {
        navigate({ pathname: location.pathname, search: '' }, { replace: true })
        return
      }
      const sp = new URLSearchParams(location.search)
      sp.set('kind', sel.type)
      sp.set('id', sel.id)
      navigate({ pathname: location.pathname, search: sp.toString() })
    },
    [navigate, location.pathname, location.search]
  )

  const goToTab = useCallback(
    (id: TabId) => {
      navigate({ pathname: '/' + id, search: location.search })
    },
    [navigate, location.search]
  )

  const [crawls, setCrawls] = useState<Campaign[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [peopleHasMore, setPeopleHasMore] = useState(true)
  const [companiesHasMore, setCompaniesHasMore] = useState(true)
  const [crawlsLoading, setCrawlsLoading] = useState(true)
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [crawlRunsByCrawlId, setCrawlRunsByCrawlId] = useState<
    Record<string, CampaignRun[]>
  >({})
  const [crawlRunsLoading, setCrawlRunsLoading] = useState(false)
  const [crawlUsageByCrawlId, setCrawlUsageByCrawlId] = useState<
    Record<
      string,
      { totals: UsageByCampaignRow | null; runs: UsageByRunRow[] } | undefined
    >
  >({})
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [mailboxesLoading, setMailboxesLoading] = useState(false)
  const [pendingDraftsByCompany, setPendingDraftsByCompany] = useState<Map<string, number>>(
    new Map()
  )
  const [pendingDraftCount, setPendingDraftCount] = useState(0)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [agenticSearchOpen, setAgenticSearchOpen] = useState(false)
  const [agenticPeopleMatchIds, setAgenticPeopleMatchIds] = useState<Set<string> | null>(null)
  const [agenticCompanyMatchIds, setAgenticCompanyMatchIds] = useState<Set<string> | null>(null)
  const [visiblePersonIds, setVisiblePersonIds] = useState<string[]>([])
  const [visibleCompanyIds, setVisibleCompanyIds] = useState<string[]>([])

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

  const loadCrawlRuns = useCallback(async (crawlId: string) => {
    setCrawlRunsLoading(true)
    try {
      const [runs, byCampaign, byRun] = await Promise.all([
        apiGet<CampaignRun[]>('/campaigns/' + crawlId + '/runs'),
        apiGet<{ data: UsageByCampaignRow[] }>('/usage/by-campaign'),
        apiGet<{ data: UsageByRunRow[] }>(
          '/usage/by-run?campaign_id=' + crawlId
        )
      ])
      setCrawlRunsByCrawlId((current) => ({ ...current, [crawlId]: runs }))
      const totals =
        byCampaign.data.find((r) => r.campaignId === crawlId) ?? null
      setCrawlUsageByCrawlId((current) => ({
        ...current,
        [crawlId]: { totals, runs: byRun.data }
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs')
    } finally {
      setCrawlRunsLoading(false)
    }
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

  const loadMailboxes = useCallback(async () => {
    setMailboxesLoading(true)
    try {
      const data = await apiGet<Mailbox[]>('/mailboxes')
      setMailboxes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mailboxes')
    } finally {
      setMailboxesLoading(false)
    }
  }, [])

  const loadPendingDrafts = useCallback(async () => {
    try {
      const res = await apiGet<{ data: DraftQueueRow[]; total: number }>(
        '/drafts?status=pending_review&limit=200'
      )
      const map = new Map<string, number>()
      for (const row of res.data) {
        if (!row.company) continue
        map.set(row.company.id, (map.get(row.company.id) ?? 0) + 1)
      }
      setPendingDraftsByCompany(map)
      setPendingDraftCount(res.total)
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    if (!authUser) return
    let cancelled = false
    ;(async () => {
      setCrawlsLoading(true)
      try {
        await loadCrawls()
        await loadCompanies()
        await loadPeople()
        await loadMailboxes()
        await loadPendingDrafts()
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
  }, [authUser, loadCompanies, loadCrawls, loadPeople, loadMailboxes, loadPendingDrafts])

  async function runCompanyOutreach(companyId: string) {
    setRunningId(companyId)
    setError(null)
    try {
      await apiPost('/companies/' + companyId + '/outreach/run')
      await loadCompanies(0)
      await loadPendingDrafts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setRunningId(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await apiPost<Campaign>('/campaigns', { name, icpDocument, targetCount })
      await loadCrawls()
      goToTab('crawls')
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
      await loadCrawlRuns(crawlId)
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
  const peopleByCompanyForSearch = useMemo(() => {
    const map = new Map<string, Person[]>()
    for (const person of people) {
      if (!person.companyId) continue
      const current = map.get(person.companyId) ?? []
      current.push(person)
      map.set(person.companyId, current)
    }
    return map
  }, [people])
  const crawlById = useMemo(
    () => new Map(crawls.map((c) => [c.id, c])),
    [crawls]
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

  const selectedCrawl =
    detail?.type === 'crawl' ? (crawlById.get(detail.id) ?? null) : null
  const selectedCrawlPeople = useMemo(
    () =>
      selectedCrawl
        ? people.filter((p) => p.firstSeenCampaignId === selectedCrawl.id)
        : [],
    [selectedCrawl, people]
  )
  const selectedCrawlRuns = selectedCrawl
    ? (crawlRunsByCrawlId[selectedCrawl.id] ?? [])
    : []
  const selectedCrawlUsage = selectedCrawl
    ? (crawlUsageByCrawlId[selectedCrawl.id] ?? null)
    : null

  useEffect(() => {
    if (detail?.type !== 'crawl') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCrawlRuns(detail.id)
  }, [detail, loadCrawlRuns])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const cmdOrCtrl = e.metaKey || e.ctrlKey
      if (cmdOrCtrl && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }
      if (e.key === 'Escape' && !paletteOpen && detail) {
        openDetail(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [paletteOpen, detail, openDetail])

  const paletteCommands = useMemo<CommandItem[]>(() => {
    const navItems: CommandItem[] = [
      {
        id: 'nav:people',
        label: 'Go to People',
        group: 'Jump to',
        icon: Users,
        keywords: 'prospects contacts',
        onSelect: () => goToTab('people')
      },
      {
        id: 'nav:companies',
        label: 'Go to Companies',
        group: 'Jump to',
        icon: Building2,
        keywords: 'accounts',
        onSelect: () => goToTab('companies')
      },
      {
        id: 'nav:crawls',
        label: 'Go to Crawls',
        group: 'Jump to',
        icon: Search,
        keywords: 'jobs workflows research',
        onSelect: () => goToTab('crawls')
      },
      {
        id: 'nav:campaigns',
        label: 'Go to Campaigns',
        group: 'Jump to',
        icon: Mail,
        keywords: 'outreach emails working accounts',
        onSelect: () => goToTab('campaigns')
      },
      {
        id: 'nav:drafts',
        label: 'Go to Drafts',
        group: 'Jump to',
        icon: Inbox,
        keywords: 'review approve outreach pending',
        onSelect: () => goToTab('drafts')
      },
      {
        id: 'nav:mailboxes',
        label: 'Go to Mailboxes',
        group: 'Jump to',
        icon: Plug,
        keywords: 'gmail connect oauth inbox',
        onSelect: () => goToTab('mailboxes')
      },
      {
        id: 'nav:usage',
        label: 'Go to Usage',
        group: 'Jump to',
        icon: Activity,
        keywords: 'spend cost tokens billing',
        onSelect: () => goToTab('usage')
      }
    ]

    const peopleItems: CommandItem[] = people.map((p) => {
      const company = p.companyId ? companyById.get(p.companyId) : null
      const description = [p.title, company?.name].filter(Boolean).join(' - ')
      return {
        id: 'person:' + p.id,
        label: p.fullName ?? p.email ?? 'Unnamed person',
        description: description || undefined,
        group: 'People',
        icon: Users,
        keywords: collectSearchValues([
          p.email,
          p.phone,
          p.linkedinUrl,
          p.twitterUrl,
          p.title,
          p.seniority,
          p.department,
          p.lifecycleStatus,
          p.notes,
          p.context,
          p.icpKeywords,
          p.enrichmentSources,
          company?.name,
          company?.domain,
          company?.website,
          company?.industry,
          company?.employeeRange,
          company?.hqLocation,
          company?.outreachStatus,
          company?.outreachStrategy,
          company?.outreachEmailInstructions,
          company?.enrichmentPayload
        ]).join(' '),
        onSelect: () => openDetail({ type: 'person', id: p.id })
      }
    })

    const companyItems: CommandItem[] = companies.map((c) => {
      const relatedPeople = peopleByCompanyForSearch.get(c.id) ?? []
      const mailbox = c.outreachMailboxId
        ? mailboxes.find((m) => m.id === c.outreachMailboxId)
        : null
      return {
        id: 'company:' + c.id,
        label: c.name,
        description: c.domain ?? c.website ?? undefined,
        group: 'Companies',
        icon: Building2,
        keywords: collectSearchValues([
          c.domain,
          c.website,
          c.industry,
          c.employeeRange,
          c.hqLocation,
          c.outreachStatus,
          c.outreachStrategy,
          c.outreachEmailInstructions,
          c.enrichmentPayload,
          mailbox?.email,
          mailbox?.displayName,
          mailbox?.senderBio,
          mailbox?.outreachEmailInstructions,
          relatedPeople.map((person) => [
            person.fullName,
            person.email,
            person.phone,
            person.linkedinUrl,
            person.twitterUrl,
            person.title,
            person.seniority,
            person.department,
            person.lifecycleStatus,
            person.notes,
            person.context,
            person.icpKeywords,
            person.enrichmentSources
          ])
        ]).join(' '),
        onSelect: () => openDetail({ type: 'company', id: c.id })
      }
    })

    const crawlItems: CommandItem[] = crawls.map((c) => ({
      id: 'crawl:' + c.id,
      label: c.name,
      description: c.status,
      group: 'Crawls',
      icon: Search,
      keywords: c.status,
      onSelect: () => openDetail({ type: 'crawl', id: c.id })
    }))

    return [...navItems, ...crawlItems, ...companyItems, ...peopleItems]
  }, [people, companies, crawls, companyById, peopleByCompanyForSearch, mailboxes, goToTab, openDetail])

  function loadMorePeople() {
    if (!peopleLoading && peopleHasMore) void loadPeople(people.length)
  }

  function loadMoreCompanies() {
    if (!companiesLoading && companiesHasMore) void loadCompanies(companies.length)
  }

  async function handleAgenticSearch(target: AgenticSearchTarget, criteria: string) {
    if (target === 'people') {
      const personIds =
        activeTab === 'people' ? visiblePersonIds : people.map((person) => person.id)
      if (personIds.length > 200) {
        throw new Error('Agentic search can judge up to 200 loaded people. Add filters first.')
      }
      const res = await apiPost<AgenticPeopleSearchResponse>('/people/agentic-search', {
        criteria,
        personIds
      })
      setAgenticPeopleMatchIds(new Set(res.selectedPersonIds))
      setAgenticCompanyMatchIds(null)
      goToTab('people')
      if (res.errors.length > 0) {
        setError('Agentic search had errors for ' + res.errors.length + ' people.')
      }
      return {
        selectedCount: res.selectedPersonIds.length,
        totalCount: personIds.length,
        errorCount: res.errors.length
      }
    }

    const companyIds =
      activeTab === 'companies' ? visibleCompanyIds : companies.map((company) => company.id)
    if (companyIds.length > 200) {
      throw new Error('Agentic search can judge up to 200 loaded companies. Add filters first.')
    }
    const res = await apiPost<AgenticCompanySearchResponse>('/companies/agentic-search', {
      criteria,
      companyIds
    })
    setAgenticCompanyMatchIds(new Set(res.selectedCompanyIds))
    setAgenticPeopleMatchIds(null)
    goToTab('companies')
    if (res.errors.length > 0) {
      setError('Agentic search had errors for ' + res.errors.length + ' companies.')
    }
    return {
      selectedCount: res.selectedCompanyIds.length,
      totalCount: companyIds.length,
      errorCount: res.errors.length
    }
  }

  const header = headerCopy[activeTab]
  const drawerOpen = detail !== null
  const selectedKey = detail?.id ?? null
  const agenticDefaultTarget: AgenticSearchTarget =
    activeTab === 'companies' ? 'companies' : 'people'
  const agenticPeopleCount = activeTab === 'people' ? visiblePersonIds.length : people.length
  const agenticCompanyCount =
    activeTab === 'companies' ? visibleCompanyIds.length : companies.length

  const headerActions = (() => {
    switch (activeTab) {
      case 'people':
        return (
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label="Agentic search"
              onClick={() => setAgenticSearchOpen(true)}
            >
              <Sparkles />
            </Button>
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
              onClick={() => goToTab('crawls')}
            >
              New crawl
            </Button>
          </>
        )
      case 'companies':
        return (
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label="Agentic search"
              onClick={() => setAgenticSearchOpen(true)}
            >
              <Sparkles />
            </Button>
            <Button
              variant="outline"
              size="md"
              iconLeft={RefreshCw}
              onClick={() => void loadCompanies(0)}
              loading={companiesLoading && companies.length > 0}
            >
              Refresh
            </Button>
          </>
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
          <Button
            variant="outline"
            size="md"
            iconLeft={RefreshCw}
            onClick={() => {
              void loadCompanies(0)
              void loadPendingDrafts()
            }}
            loading={companiesLoading && companies.length > 0}
          >
            Refresh
          </Button>
        )
      case 'drafts':
        return null
      case 'mailboxes':
        return (
          <Button
            variant="outline"
            size="md"
            iconLeft={RefreshCw}
            onClick={() => void loadMailboxes()}
            loading={mailboxesLoading && mailboxes.length > 0}
          >
            Refresh
          </Button>
        )
      case 'usage':
        return null
    }
  })()

  async function handleSignOut() {
    try {
      await apiPost('/auth/logout')
    } catch {
      // still sign out locally
    }
    setAuthUser(null)
  }

  if (!tabValid) {
    return <Navigate to="/people" replace />
  }

  const sidebarSections = sections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.id === 'drafts' && pendingDraftCount > 0
        ? {
            ...item,
            badge: (
              <Badge
                variant="accent"
                className="h-5 min-w-5 justify-center px-1.5 text-[11px]"
                aria-label={pendingDraftCount + ' pending review drafts'}
              >
                {pendingDraftCount}
              </Badge>
            )
          }
        : item
    )
  }))

  return (
    <AppShell
      sections={sidebarSections}
      activeId={activeTab}
      onSelect={goToTab}
      onOpenSearch={() => setPaletteOpen(true)}
      userInitials={emailToInitials(authUser.email)}
      onSignOut={() => void handleSignOut()}
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

      <AgenticSearchModal
        open={agenticSearchOpen}
        defaultTarget={agenticDefaultTarget}
        peopleCount={agenticPeopleCount}
        companyCount={agenticCompanyCount}
        onOpenChange={setAgenticSearchOpen}
        onSearch={handleAgenticSearch}
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
          onSelectPerson={(person) => openDetail({ type: 'person', id: person.id })}
          onSelectCompany={(companyId) => openDetail({ type: 'company', id: companyId })}
          selectedKey={selectedKey}
          agenticMatchIds={agenticPeopleMatchIds}
          onClearAgenticResults={() => setAgenticPeopleMatchIds(null)}
          onVisibleIdsChange={setVisiblePersonIds}
        />
      ) : null}

      {activeTab === 'companies' ? (
        <CompaniesPage
          companies={companies}
          people={people}
          mailboxes={mailboxes}
          pendingDraftsByCompany={pendingDraftsByCompany}
          loading={companiesLoading}
          hasMore={companiesHasMore}
          onRefresh={() => {
            void loadCompanies(0)
            void loadPendingDrafts()
          }}
          onLoadMore={loadMoreCompanies}
          onSelectCompany={(company) => openDetail({ type: 'company', id: company.id })}
          selectedKey={selectedKey}
          onError={(msg) => setError(msg)}
          agenticMatchIds={agenticCompanyMatchIds}
          onClearAgenticResults={() => setAgenticCompanyMatchIds(null)}
          onVisibleIdsChange={setVisibleCompanyIds}
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
          onSelectCrawl={(crawl) => openDetail({ type: 'crawl', id: crawl.id })}
          selectedKey={selectedKey}
        />
      ) : null}

      {activeTab === 'campaigns' ? (
        <CampaignsPage
          companies={companies}
          mailboxes={mailboxes}
          pendingDraftsByCompany={pendingDraftsByCompany}
          loading={companiesLoading}
          onRefresh={() => {
            void loadCompanies(0)
            void loadPendingDrafts()
          }}
          onSelectCompany={(company) => openDetail({ type: 'company', id: company.id })}
          onGoToDrafts={() => goToTab('drafts')}
          onGoToCompanies={() => goToTab('companies')}
          onRunCompany={(id) => void runCompanyOutreach(id)}
          runningId={runningId}
          selectedKey={selectedKey}
        />
      ) : null}

      {activeTab === 'drafts' ? (
        <DraftsPage mailboxes={mailboxes} onPendingReviewChanged={loadPendingDrafts} />
      ) : null}

      {activeTab === 'mailboxes' ? (
        <MailboxesPage
          mailboxes={mailboxes}
          loading={mailboxesLoading}
          onRefresh={() => void loadMailboxes()}
        />
      ) : null}

      {activeTab === 'usage' ? (
        <UsagePage
          crawls={crawls}
          companyById={companyById}
          personById={personById}
          onSelectCrawl={(crawl) => openDetail({ type: 'crawl', id: crawl.id })}
          onSelectCompany={(companyId) => openDetail({ type: 'company', id: companyId })}
          onSelectPerson={(person) => openDetail({ type: 'person', id: person.id })}
        />
      ) : null}

      <DetailDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) openDetail(null)
        }}
        person={selectedPerson}
        company={selectedCompany}
        crawl={selectedCrawl}
        companyPeople={selectedCompanyPeople}
        crawlPeople={selectedCrawlPeople}
        crawlRuns={selectedCrawlRuns}
        crawlRunsLoading={crawlRunsLoading}
        crawlUsage={selectedCrawlUsage}
        runningId={runningId}
        mailboxes={mailboxes}
        onSelectPerson={(person) => openDetail({ type: 'person', id: person.id })}
        onSelectCompany={(companyId) => openDetail({ type: 'company', id: companyId })}
        onRunCrawl={startRun}
        onCompanyChanged={() => {
          void loadCompanies(0)
          void loadPendingDrafts()
        }}
        onError={(msg) => setError(msg)}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={paletteCommands}
      />
    </AppShell>
  )
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthUser(null)
    })
    return () => {
      setUnauthorizedHandler(undefined)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { user } = await apiAuthMe()
        if (!cancelled) setAuthUser(user)
      } catch {
        if (!cancelled) setAuthUser(null)
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!authChecked) {
    return (
      <div className="flex h-svh items-center justify-center bg-bg text-sm text-ink-muted">
        Loading…
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          authUser ? <Navigate to="/people" replace /> : <LoginPage onAuthed={setAuthUser} />
        }
      />
      <Route path="/" element={<HomeRoute authUser={authUser} />} />
      <Route
        path="/:tab"
        element={
          authUser ? (
            <FlashApp authUser={authUser} setAuthUser={setAuthUser} />
          ) : (
            <NavigateToLogin />
          )
        }
      />
      <Route
        path="*"
        element={authUser ? <Navigate to="/people" replace /> : <NavigateToLogin />}
      />
    </Routes>
  )
}
