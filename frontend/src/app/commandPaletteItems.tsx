import { Activity, Building2, Inbox, ListChecks, Mail, Plug, Search, Users } from 'lucide-react'

import type { Campaign, Company, Person, ProspectList } from '@/api'
import type { CommandItem } from '@/components/CommandPalette'

import type { DetailSelection } from './types'
import type { TabId } from './navigation'

type BuildCommandItemsParams = {
  lists: ProspectList[]
  crawls: Campaign[]
  companyById: Map<string, Company>
  people: Person[]
  companies: Company[]
  goToTab: (id: TabId) => void
  openDetail: (selection: DetailSelection) => void
}

export function buildCommandItems({
  lists,
  crawls,
  companyById,
  people,
  companies,
  goToTab,
  openDetail
}: BuildCommandItemsParams): CommandItem[] {
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
      id: 'nav:lists',
      label: 'Go to Lists',
      group: 'Jump to',
      icon: ListChecks,
      keywords: 'saved groups segments',
      onSelect: () => goToTab('lists')
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
      keywords: [p.email, p.title, p.fullName, company?.name, company?.domain]
        .filter(Boolean)
        .join(' '),
      onSelect: () => openDetail({ type: 'person', id: p.id })
    }
  })

  const companyItems: CommandItem[] = companies.map((c) => ({
    id: 'company:' + c.id,
    label: c.name,
    description: c.domain ?? c.website ?? undefined,
    group: 'Companies',
    icon: Building2,
    keywords: [c.domain, c.website, c.industry, c.name].filter(Boolean).join(' '),
    onSelect: () => openDetail({ type: 'company', id: c.id })
  }))

  const crawlItems: CommandItem[] = crawls.map((c) => ({
    id: 'crawl:' + c.id,
    label: c.name,
    description: c.status,
    group: 'Crawls',
    icon: Search,
    keywords: c.status,
    onSelect: () => openDetail({ type: 'crawl', id: c.id })
  }))

  const listItems: CommandItem[] = lists.map((list) => ({
    id: 'list:' + list.id,
    label: list.name,
    description: list.type === 'people' ? 'People list' : 'Company list',
    group: 'Lists',
    icon: ListChecks,
    keywords: list.type,
    onSelect: () => goToTab('lists')
  }))

  return [...navItems, ...listItems, ...crawlItems, ...companyItems, ...peopleItems]
}
