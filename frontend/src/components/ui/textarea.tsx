import * as React from 'react'

import { cn } from '@/lib/utils'

type Variant = 'default' | 'code'

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: Variant
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'min-h-[88px] w-full rounded-md border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-faint',
          'transition-[border-color,box-shadow] duration-120 ease-out',
          'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'code'
            ? 'bg-surface-muted/60 font-mono text-[13px] leading-[20px]'
            : 'bg-surface',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
