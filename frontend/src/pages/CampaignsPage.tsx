import { Building2, Inbox, Mail, Play, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'

import type { Company, Mailbox } from '@/api'
import { Button } from '@/components/ui/button'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { StatusDot } from '@/components/ui/status-dot'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'
import { CompanyLogo } from '@/components/CompanyLogo'
import { formatRelative } from '@/lib/format'

interface Props {
  companies: Company[]
  mailboxes: Mailbox[]
  pendingDraftsByCompany: Map<string, number>
  loading: boolean
  onRefresh: () => void
  onSelectCompany: (company: Company) => void
  onGoToDrafts: () => void
  onGoToCompanies: () => void
  onRunCompany: (companyId: string) => void
  runningId: string | null
  selectedKey: string | null
}

export function CampaignsPage({
  companies,
  mailboxes,
  pendingDraftsByCompany,
  loading,
  onRefresh,
  onSelectCompany,
  onGoToDrafts,
  onGoToCompanies,
  onRunCompany,
  runningId,
  selectedKey
}: Props) {
  const workingCompanies = useMemo(
    () =>
      companies
        .filter((c) => c.outreachStatus === 'working')
        .sort((a, b) => {
          const aWake = a.outreachNextWakeAt ? new Date(a.outreachNextWakeAt).getTime() : Infinity
          const bWake = b.outreachNextWakeAt ? new Date(b.outreachNextWakeAt).getTime() : Infinity
          return aWake - bWake
        }),
    [companies]
  )

  const mailboxById = useMemo(() => new Map(mailboxes.map((m) => [m.id, m])), [mailboxes])

  const totalPending = useMemo(
    () => Array.from(pendingDraftsByCompany.values()).reduce((acc, n) => acc + n, 0),
    [pendingDraftsByCompany]
  )

  const columns: DataTableColumn<Company>[] = [
    {
      id: 'name',
      header: 'Account',
      width: '28%',
      cell: (c) => {
        return (
          <div className="flex items-center gap-2.5">
            <CompanyLogo company={c} />
            <span className="truncate font-medium text-ink">{c.name}</span>
          </div>
        )
      }
    },
    {
      id: 'mailbox',
      header: 'Mailbox',
      width: '22%',
      cell: (c) => {
        if (!c.outreachMailboxId) return <span className="text-ink-faint">-</span>
        const m = mailboxById.get(c.outreachMailboxId)
        return (
          <span className="truncate font-mono text-[12px] text-ink-muted">
            {m?.email ?? '(missing)'}
          </span>
        )
      }
    },
    {
      id: 'status',
      header: 'Status',
      width: '120px',
      cell: (c) => <StatusDot status={c.outreachStatus} size="sm" />
    },
    {
      id: 'pending',
      header: 'Pending',
      align: 'right',
      width: '90px',
      cell: (c) => {
        const n = pendingDraftsByCompany.get(c.id) ?? 0
        return (
          <span
            className={
              n > 0
                ? 'font-mono tabular text-[12.5px] text-warn'
                : 'font-mono tabular text-[12.5px] text-ink-faint'
            }
          >
            {n}
          </span>
        )
      }
    },
    {
      id: 'wake',
      header: 'Next wake',
      width: '140px',
      cell: (c) =>
        c.outreachNextWakeAt ? (
          <span className="truncate text-[12.5px] text-ink-muted">
            {formatRelative(c.outreachNextWakeAt) ?? '-'}
          </span>
        ) : (
          <span className="text-ink-faint">-</span>
        )
    },
    {
      id: 'lastWorked',
      header: 'Last worked',
      width: '140px',
      cell: (c) =>
        c.outreachLastWorkedAt ? (
          <span className="truncate text-[12.5px] text-ink-muted">
            {formatRelative(c.outreachLastWorkedAt) ?? '-'}
          </span>
        ) : (
          <span className="text-ink-faint">never</span>
        )
    },
    {
      id: 'action',
      header: '',
      align: 'right',
      width: '100px',
      cell: (c) => (
        <Button
          variant="outline"
          size="sm"
          iconLeft={Play}
          loading={runningId === c.id}
          onClick={(e) => {
            e.stopPropagation()
            onRunCompany(c.id)
          }}
        >
          Run
        </Button>
      )
    }
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <Toolbar>
        <span className="text-sm font-medium text-ink">{workingCompanies.length} working</span>
        <span className="text-xs text-ink-muted">
          {totalPending} pending {totalPending === 1 ? 'draft' : 'drafts'}
        </span>
        <ToolbarSpacer />
        <Button variant="outline" size="md" iconLeft={Inbox} onClick={onGoToDrafts}>
          Review drafts
        </Button>
        <Button variant="outline" size="md" iconLeft={Building2} onClick={onGoToCompanies}>
          Pick more accounts
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh"
          onClick={onRefresh}
          loading={loading && workingCompanies.length > 0}
        >
          {!(loading && workingCompanies.length > 0) ? <RefreshCw /> : null}
        </Button>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={workingCompanies}
        rowKey={(c) => c.id}
        loading={loading}
        onRowClick={onSelectCompany}
        selectedRowKey={selectedKey}
        minWidth="1000px"
        empty={{
          icon: Mail,
          title: 'No active outreach yet',
          description:
            'Pick accounts from Companies, assign a mailbox, and start working them. They will appear here as the agent runs.',
          primaryAction: {
            label: 'Pick accounts',
            icon: Building2,
            onClick: onGoToCompanies
          }
        }}
      />
    </div>
  )
}
