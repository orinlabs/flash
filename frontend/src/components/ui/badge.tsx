import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 h-6 text-xs ring-1 transition-colors',
  {
    variants: {
      variant: {
        soft: 'bg-surface-muted text-ink-muted ring-line',
        outline: 'bg-transparent text-ink-muted ring-line',
        mono: 'bg-surface-muted text-ink-muted ring-line font-mono text-[11px] tracking-tight',
        accent: 'bg-accent-soft text-accent ring-accent/20'
      }
    },
    defaultVariants: {
      variant: 'soft'
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
