import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Building2, Sparkles, Users, X, type LucideIcon } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type AgenticSearchTarget = 'people' | 'companies'

type AgenticSearchResult = {
  selectedCount: number
  totalCount: number
  errorCount: number
  selectedIds: string[]
}

export type AgenticSearchProgress = {
  completed: number
  total: number
  matched: number
  errors: number
}

interface AgenticSearchModalProps {
  open: boolean
  defaultTarget: AgenticSearchTarget
  peopleCount: number
  companyCount: number
  onOpenChange: (open: boolean) => void
  onSearch: (
    target: AgenticSearchTarget,
    criteria: string,
    onProgress: (progress: AgenticSearchProgress) => void
  ) => Promise<AgenticSearchResult>
  onCreateList: (
    target: AgenticSearchTarget,
    name: string,
    selectedIds: string[]
  ) => Promise<void>
}

export function AgenticSearchModal({
  open,
  defaultTarget,
  peopleCount,
  companyCount,
  onOpenChange,
  onSearch,
  onCreateList
}: AgenticSearchModalProps) {
  const [target, setTarget] = useState<AgenticSearchTarget>(defaultTarget)
  const [criteria, setCriteria] = useState('')
  const [searching, setSearching] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [progress, setProgress] = useState<AgenticSearchProgress | null>(null)
  const [lastResult, setLastResult] = useState<{
    target: AgenticSearchTarget
    selectedIds: string[]
  } | null>(null)
  const [listName, setListName] = useState('')
  const [savingList, setSavingList] = useState(false)

  useEffect(() => {
    if (!open) return
    setTarget(defaultTarget)
    setSummary(null)
    setLocalError(null)
    setProgress(null)
    setLastResult(null)
    setListName('')
  }, [defaultTarget, open])

  const targetCount = target === 'people' ? peopleCount : companyCount
  const targetLabel = target === 'people' ? 'people' : 'companies'

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = criteria.trim()
    if (!trimmed) {
      setLocalError('Enter criteria for the agentic search.')
      return
    }
    if (targetCount === 0) {
      setLocalError('No loaded ' + targetLabel + ' to search.')
      return
    }
    if (targetCount > 200) {
      setLocalError(
        'Agentic search can judge up to 200 loaded ' + targetLabel + '. Add filters first.'
      )
      return
    }

    setSearching(true)
    setSummary(null)
    setLocalError(null)
    setProgress({ completed: 0, total: targetCount, matched: 0, errors: 0 })
    setLastResult(null)
    setListName('')
    try {
      const result = await onSearch(target, trimmed, setProgress)
      setLastResult({ target, selectedIds: result.selectedIds })
      setListName('Agentic ' + targetLabel + ' search')
      setSummary(
        'Selected ' +
          result.selectedCount +
          ' of ' +
          result.totalCount +
          ' ' +
          targetLabel +
          (result.errorCount > 0 ? ' with ' + result.errorCount + ' errors' : '')
      )
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Agentic search failed')
    } finally {
      setSearching(false)
    }
  }

  async function saveList() {
    if (!lastResult || lastResult.selectedIds.length === 0) return
    const trimmed = listName.trim()
    if (!trimmed) {
      setLocalError('Name the list before saving it.')
      return
    }

    setSavingList(true)
    setLocalError(null)
    try {
      await onCreateList(lastResult.target, trimmed, lastResult.selectedIds)
      setSummary('Saved "' + trimmed + '" with ' + lastResult.selectedIds.length + ' items.')
      setLastResult(null)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save list')
    } finally {
      setSavingList(false)
    }
  }

  const progressPercent =
    progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]',
            'data-[state=open]:animate-overlayIn data-[state=closed]:animate-overlayOut'
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-[18vh] z-50 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2',
            'overflow-hidden rounded-xl border border-line bg-surface shadow-elevated',
            'duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-3',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-3',
            'focus:outline-none'
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-4 py-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-[17px] font-semibold tracking-tight text-ink">
                Agentic search
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-ink-muted">
                Describe what should match, then let the agent judge loaded people or companies.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={(event) => void submit(event)} className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-2">
              <TargetButton
                active={target === 'people'}
                icon={Users}
                label="People"
                count={peopleCount}
                onClick={() => setTarget('people')}
              />
              <TargetButton
                active={target === 'companies'}
                icon={Building2}
                label="Companies"
                count={companyCount}
                onClick={() => setTarget('companies')}
              />
            </div>

            <Textarea
              value={criteria}
              onChange={(event) => setCriteria(event.target.value)}
              placeholder="Example: VP-level product or engineering leaders at fintech companies with clear AI or data infrastructure needs."
              className="min-h-[132px]"
              autoFocus
            />

            {localError ? (
              <div className="rounded-md border border-bad/25 bg-bad/10 px-3 py-2 text-sm text-bad">
                {localError}
              </div>
            ) : null}
            {summary ? (
              <div className="space-y-3 rounded-md border border-line bg-surface-muted/60 px-3 py-2">
                <div className="text-sm text-ink-muted">{summary}</div>
                {lastResult && lastResult.selectedIds.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={listName}
                      onChange={(event) => setListName(event.target.value)}
                      placeholder="List name"
                      className="bg-surface"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      loading={savingList}
                      onClick={() => void saveList()}
                    >
                      Save list
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {progress && searching ? (
              <div className="space-y-2 rounded-md border border-line bg-surface-muted/60 px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
                  <span>
                    Judged {progress.completed} of {progress.total} {targetLabel}
                  </span>
                  <span className="font-mono text-xs text-ink-faint">{progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: progressPercent + '%' }}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-faint">
                  <span>{progress.matched} matched</span>
                  <span>{progress.errors} errors</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <span className="text-xs text-ink-faint">
                Judges {targetCount} loaded {targetCount === 1 ? targetLabel.slice(0, -1) : targetLabel}
              </span>
              <div className="flex items-center gap-2">
                <DialogPrimitive.Close asChild>
                  <Button type="button" variant="outline" size="md">
                    Close
                  </Button>
                </DialogPrimitive.Close>
                <Button type="submit" variant="accent" size="md" loading={searching}>
                  Search
                </Button>
              </div>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function TargetButton({
  active,
  icon: Icon,
  label,
  count,
  onClick
}: {
  active: boolean
  icon: LucideIcon
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
        active
          ? 'border-accent bg-accent-soft text-ink'
          : 'border-line bg-surface text-ink-muted hover:bg-surface-muted'
      )}
    >
      <Icon className={cn('size-4 shrink-0', active ? 'text-accent' : 'text-ink-faint')} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink-faint">{count} loaded</span>
      </span>
    </button>
  )
}
