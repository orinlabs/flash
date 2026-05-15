import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type Variant = 'default' | 'mono'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: Variant
  iconLeft?: LucideIcon
  iconRight?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = 'default', iconLeft: IconLeft, iconRight, ...props }, ref) => {
    const base = (
      <input
        ref={ref}
        type={type}
        className={cn(
          'h-8 w-full bg-surface text-sm text-ink placeholder:text-ink-faint',
          'rounded-md border border-line px-2.5',
          'transition-[border-color,box-shadow] duration-120 ease-out',
          'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variant === 'mono' && 'font-mono',
          IconLeft && 'pl-8',
          iconRight && 'pr-8',
          className
        )}
        {...props}
      />
    )
    if (!IconLeft && !iconRight) return base
    return (
      <div className="relative">
        {IconLeft ? (
          <IconLeft className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        ) : null}
        {base}
        {iconRight ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint">
            {iconRight}
          </span>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
