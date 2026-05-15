import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

type BannerTone = 'info' | 'success' | 'warning' | 'error'

const toneClass: Record<BannerTone, string> = {
  info: 'border-info/30 bg-info/5 text-ink',
  success: 'border-ok/30 bg-ok/5 text-ink',
  warning: 'border-warn/40 bg-warn/5 text-ink',
  error: 'border-bad/40 bg-bad/5 text-ink'
}

const toneIconClass: Record<BannerTone, string> = {
  info: 'text-info',
  success: 'text-ok',
  warning: 'text-warn',
  error: 'text-bad'
}

const toneIcon = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle
}

export interface BannerProps {
  tone?: BannerTone
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  onDismiss?: () => void
  className?: string
}

export function Banner({
  tone = 'info',
  title,
  description,
  action,
  onDismiss,
  className
}: BannerProps) {
  const Icon = toneIcon[tone]
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-md border px-3 py-2.5 text-sm',
        toneClass[tone],
        className
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', toneIconClass[tone])} />
      <div className="flex-1 min-w-0">
        {title ? <div className="font-medium">{title}</div> : null}
        {description ? (
          <div className="text-ink-muted">{description}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
