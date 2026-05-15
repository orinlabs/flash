import { ChevronRight, Mail } from 'lucide-react'

import type { DraftQueueRow } from '@/api'
import { StatusDot } from '@/components/ui/status-dot'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'

export function DraftListItem({
  row,
  selected,
  onSelect
}: {
  row: DraftQueueRow
  selected: boolean
  onSelect: () => void
}) {
  const { draft, company, person, mailbox } = row
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted/60',
          selected && 'bg-surface-muted'
        )}
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-muted">
          <Mail className="size-4 text-ink-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">
              {company?.name ?? '(unknown company)'}
            </span>
            <StatusDot status={draft.status} size="sm" />
          </div>
          <div className="truncate text-[13px] text-ink-muted">{draft.subject}</div>
          <div className="mt-1 truncate text-2xs text-ink-faint">
            {person?.fullName ? person.fullName + ' • ' : ''}
            {draft.toEmail}
            {mailbox?.email ? ' • via ' + mailbox.email : ''}
          </div>
          <div className="mt-1 text-2xs text-ink-faint">
            {formatRelative(draft.createdAt) ?? '-'}
          </div>
        </div>
        {selected ? <ChevronRight className="size-3.5 text-ink-faint" /> : null}
      </button>
    </li>
  )
}
