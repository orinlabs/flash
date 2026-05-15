import { cn } from '@/lib/utils'

export function Toolbar({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ToolbarSpacer() {
  return <div className="ml-auto" />
}
