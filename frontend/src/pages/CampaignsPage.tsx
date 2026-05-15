import { ArrowRight, Mail, Search, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  onGoToCrawls?: () => void
}

export function CampaignsPage({ onGoToCrawls }: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-bg">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        <Card className="overflow-hidden">
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg border border-line bg-surface-muted text-ink">
              <Mail className="size-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Email campaigns</h2>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">
              Once you have qualified prospects, generate personalized drafts and review them
              before they land as Gmail drafts.
            </p>
          </div>
          <div className="grid grid-cols-3 border-t border-line">
            <Step
              index={1}
              icon={Search}
              title="Crawl"
              description="Describe an ICP and let the agent surface matching prospects."
            />
            <Step
              index={2}
              icon={Sparkles}
              title="Pick people"
              description="Triage the list, mark qualified contacts, drop the rest."
              middle
            />
            <Step
              index={3}
              icon={Mail}
              title="Generate drafts"
              description="Personalized emails per person, ready in your Gmail drafts."
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-muted/40 px-6 py-4">
            <p className="text-sm text-ink-muted">Available after your first crawl.</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={onGoToCrawls}
                iconRight={ArrowRight}
              >
                Start a crawl
              </Button>
              <Button variant="primary" size="md" disabled>
                New campaign
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Step({
  index,
  icon: Icon,
  title,
  description,
  middle
}: {
  index: number
  icon: LucideIcon
  title: string
  description: string
  middle?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 px-6 py-5',
        middle && 'border-x border-line'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-full border border-line bg-surface text-[10px] font-mono font-semibold text-ink-muted">
          {index}
        </span>
        <Icon className="size-3.5 text-ink-faint" />
        <span className="text-sm font-medium text-ink">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-ink-muted">{description}</p>
    </div>
  )
}
