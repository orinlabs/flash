import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Mail, MessageSquare, PencilLine, X, type LucideIcon } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export type DraftMessagesChannel = 'email' | 'linkedin'

export type DraftMessagesProgress = {
  completed: number
  total: number
  generated: number
  errors: number
}

export type DraftMessagesResult = {
  generatedCount: number
  errorCount: number
  totalCount: number
}

interface DraftMessagesModalProps {
  open: boolean
  selectedCount: number
  onOpenChange: (open: boolean) => void
  onDraft: (
    channel: DraftMessagesChannel,
    prompt: string,
    onProgress: (progress: DraftMessagesProgress) => void
  ) => Promise<DraftMessagesResult>
}

export function DraftMessagesModal({
  open,
  selectedCount,
  onOpenChange,
  onDraft
}: DraftMessagesModalProps) {
  const [channel, setChannel] = useState<DraftMessagesChannel>('email')
  const [prompt, setPrompt] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [progress, setProgress] = useState<DraftMessagesProgress | null>(null)

  useEffect(() => {
    if (!open) return
    setChannel('email')
    setSummary(null)
    setLocalError(null)
    setProgress(null)
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) {
      setLocalError('Describe what each message should say.')
      return
    }
    if (selectedCount === 0) {
      setLocalError('Select at least one person on the People page.')
      return
    }
    if (selectedCount > 100) {
      setLocalError('Drafting is limited to 100 people per batch. Narrow your selection.')
      return
    }

    setDrafting(true)
    setSummary(null)
    setLocalError(null)
    setProgress({ completed: 0, total: selectedCount, generated: 0, errors: 0 })

    try {
      const result = await onDraft(channel, trimmed, setProgress)
      const channelLabel = channel === 'email' ? 'email' : 'LinkedIn message'
      const noun = result.generatedCount === 1 ? 'draft' : 'drafts'
      setSummary(
        'Saved ' +
          result.generatedCount +
          ' ' +
          channelLabel +
          ' ' +
          noun +
          ' to notes' +
          (result.errorCount > 0 ? ' (' + result.errorCount + ' failed)' : '') +
          '.'
      )
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Drafting failed')
    } finally {
      setDrafting(false)
    }
  }

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0

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
              <PencilLine className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-[17px] font-semibold tracking-tight text-ink">
                Draft messages
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-ink-muted">
                Describe the angle. We will draft a personalized message for each selected person and save it to their notes.
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
              <ChannelButton
                active={channel === 'email'}
                icon={Mail}
                label="Email"
                description="Subject + body"
                onClick={() => setChannel('email')}
              />
              <ChannelButton
                active={channel === 'linkedin'}
                icon={MessageSquare}
                label="LinkedIn"
                description="Short DM, no subject"
                onClick={() => setChannel('linkedin')}
              />
            </div>

            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={
                channel === 'email'
                  ? 'Example: introduce our new agent for solo founders. Mention their work on developer tooling if visible. Ask if a short call next week makes sense.'
                  : 'Example: short, friendly intro. Reference something specific from their profile. Ask one easy question.'
              }
              className="min-h-[132px]"
              autoFocus
            />

            {localError ? (
              <div className="rounded-md border border-bad/25 bg-bad/10 px-3 py-2 text-sm text-bad">
                {localError}
              </div>
            ) : null}
            {summary ? (
              <div className="rounded-md border border-line bg-surface-muted/60 px-3 py-2 text-sm text-ink-muted">
                {summary}
              </div>
            ) : null}
            {progress && drafting ? (
              <div className="space-y-2 rounded-md border border-line bg-surface-muted/60 px-3 py-2">
                <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
                  <span>
                    Drafted {progress.completed} of {progress.total}
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
                  <span>{progress.generated} saved</span>
                  <span>{progress.errors} errors</span>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <span className="text-xs text-ink-faint">
                Drafts for {selectedCount} {selectedCount === 1 ? 'person' : 'people'}
              </span>
              <div className="flex items-center gap-2">
                <DialogPrimitive.Close asChild>
                  <Button type="button" variant="outline" size="md">
                    Close
                  </Button>
                </DialogPrimitive.Close>
                <Button
                  type="submit"
                  variant="accent"
                  size="md"
                  loading={drafting}
                  disabled={selectedCount === 0}
                >
                  Draft messages
                </Button>
              </div>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ChannelButton({
  active,
  icon: Icon,
  label,
  description,
  onClick
}: {
  active: boolean
  icon: LucideIcon
  label: string
  description: string
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
        <span className="block text-xs text-ink-faint">{description}</span>
      </span>
    </button>
  )
}
