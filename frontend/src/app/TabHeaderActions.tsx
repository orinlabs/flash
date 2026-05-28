import { PencilLine, Plus, RefreshCw, Sparkles } from 'lucide-react'

import type { Campaign, Company, Mailbox, ProspectList } from '@/api'
import { Button } from '@/components/ui/button'

import type { TabId } from './navigation'

type Props = {
  activeTab: TabId
  people: unknown[]
  peopleLoading: boolean
  companies: Company[]
  companiesLoading: boolean
  lists: ProspectList[]
  listsLoading: boolean
  crawls: Campaign[]
  crawlsLoading: boolean
  mailboxes: Mailbox[]
  mailboxesLoading: boolean
  selectedPersonCount: number
  onOpenAgenticSearch: () => void
  onOpenDraftMessages: () => void
  onLoadPeople: () => void
  onLoadCompanies: () => void
  onLoadLists: () => void
  onLoadCrawls: () => void
  onLoadMailboxes: () => void
  onLoadPendingDrafts: () => void
  onNewCrawl: () => void
}

export function TabHeaderActions({
  activeTab,
  people,
  peopleLoading,
  companies,
  companiesLoading,
  lists,
  listsLoading,
  crawls,
  crawlsLoading,
  mailboxes,
  mailboxesLoading,
  selectedPersonCount,
  onOpenAgenticSearch,
  onOpenDraftMessages,
  onLoadPeople,
  onLoadCompanies,
  onLoadLists,
  onLoadCrawls,
  onLoadMailboxes,
  onLoadPendingDrafts,
  onNewCrawl
}: Props) {
  switch (activeTab) {
    case 'people':
      return (
        <>
          <Button
            variant="outline"
            size="md"
            iconLeft={PencilLine}
            onClick={onOpenDraftMessages}
            disabled={selectedPersonCount === 0}
          >
            {selectedPersonCount > 0
              ? 'Draft messages (' + selectedPersonCount + ')'
              : 'Draft messages'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Agentic search"
            onClick={onOpenAgenticSearch}
          >
            <Sparkles />
          </Button>
          <Button
            variant="outline"
            size="md"
            iconLeft={RefreshCw}
            onClick={onLoadPeople}
            loading={peopleLoading && people.length > 0}
          >
            Refresh
          </Button>
          <Button variant="primary" size="md" iconLeft={Plus} onClick={onNewCrawl}>
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
            onClick={onOpenAgenticSearch}
          >
            <Sparkles />
          </Button>
          <Button
            variant="outline"
            size="md"
            iconLeft={RefreshCw}
            onClick={onLoadCompanies}
            loading={companiesLoading && companies.length > 0}
          >
            Refresh
          </Button>
        </>
      )
    case 'lists':
      return (
        <Button
          variant="outline"
          size="md"
          iconLeft={RefreshCw}
          onClick={onLoadLists}
          loading={listsLoading && lists.length > 0}
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
          onClick={onLoadCrawls}
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
            onLoadCompanies()
            onLoadPendingDrafts()
          }}
          loading={companiesLoading && companies.length > 0}
        >
          Refresh
        </Button>
      )
    case 'mailboxes':
      return (
        <Button
          variant="outline"
          size="md"
          iconLeft={RefreshCw}
          onClick={onLoadMailboxes}
          loading={mailboxesLoading && mailboxes.length > 0}
        >
          Refresh
        </Button>
      )
    case 'drafts':
    case 'usage':
      return null
  }
}
