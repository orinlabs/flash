import type { LucideIcon } from 'lucide-react'

import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  primaryAction?: {
    label: string
    onClick?: () => void
    icon?: LucideIcon
    disabled?: boolean
    variant?: ButtonProps['variant']
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  compact
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 py-10' : 'gap-3 py-16',
        className
      )}
    >
      {Icon ? (
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg border border-line bg-surface-muted text-ink-faint">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="mt-2 flex items-center gap-2">
          {primaryAction ? (
            <Button
              variant={primaryAction.variant ?? 'primary'}
              size="md"
              iconLeft={primaryAction.icon}
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
            >
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            secondaryAction.href ? (
              <a
                className="text-sm text-ink-muted underline-offset-4 hover:text-accent hover:underline"
                href={secondaryAction.href}
                target="_blank"
                rel="noreferrer"
              >
                {secondaryAction.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="text-sm text-ink-muted underline-offset-4 hover:text-accent hover:underline"
              >
                {secondaryAction.label}
              </button>
            )
          ) : null}
        </div>
      )}
    </div>
  )
}
