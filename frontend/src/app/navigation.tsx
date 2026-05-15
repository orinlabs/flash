import { Activity, Building2, Inbox, ListChecks, Mail, Plug, Search, Users } from 'lucide-react'

import type { SidebarSection } from '@/components/layout/Sidebar'

export type TabId =
  | 'people'
  | 'companies'
  | 'lists'
  | 'crawls'
  | 'campaigns'
  | 'drafts'
  | 'mailboxes'
  | 'usage'

export const sections: SidebarSection<TabId>[] = [
  {
    label: 'Pipeline',
    items: [
      { id: 'people', label: 'People', icon: Users },
      { id: 'companies', label: 'Companies', icon: Building2 },
      { id: 'lists', label: 'Lists', icon: ListChecks }
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

export const headerCopy: Record<TabId, { title: string; description: string }> = {
  people: { title: 'People', description: 'Prospects discovered from crawls.' },
  companies: { title: 'Companies', description: 'Accounts found during research.' },
  lists: { title: 'Lists', description: 'Saved groups of people and companies.' },
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
  'lists',
  'crawls',
  'campaigns',
  'drafts',
  'mailboxes',
  'usage'
]

export function isTabId(value: string | undefined): value is TabId {
  return value !== undefined && (TAB_IDS as readonly string[]).includes(value)
}
