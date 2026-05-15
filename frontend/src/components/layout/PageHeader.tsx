import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex h-12 shrink-0 items-center gap-3 border-b border-line bg-bg px-5',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumb ? (
          <div className="text-2xs uppercase tracking-wide text-ink-faint">
            {breadcrumb}
          </div>
        ) : null}
        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>
          {description ? (
            <span className="truncate text-sm text-ink-muted">{description}</span>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
