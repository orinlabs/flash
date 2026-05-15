import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-[linear-gradient(90deg,hsl(var(--surface-muted))_0%,hsl(var(--surface-sunken))_50%,hsl(var(--surface-muted))_100%)] bg-[length:200%_100%]',
        'animate-[shimmer_1.4s_ease_infinite]',
        className
      )}
      {...props}
    />
  )
}
