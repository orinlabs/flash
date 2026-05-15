import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium',
    'transition-[background-color,border-color,color,box-shadow] duration-120 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-0',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'
  ),
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
        outline:
          'bg-surface text-ink border border-line hover:bg-surface-muted hover:border-line-strong',
        subtle:
          'bg-surface-muted text-ink hover:bg-surface-sunken border border-transparent',
        ghost: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
        destructive:
          'bg-bad text-white hover:bg-bad/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]',
        link: 'h-auto px-0 text-ink underline-offset-4 hover:text-accent hover:underline',
        accent:
          'bg-accent text-accent-foreground hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]'
      },
      size: {
        sm: 'h-7 px-2.5 text-xs gap-1 [&_svg]:size-3.5',
        md: 'h-8 px-3',
        lg: 'h-9 px-4',
        icon: 'h-8 w-8 px-0',
        'icon-sm': 'h-7 w-7 px-0 [&_svg]:size-3.5'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  iconLeft?: LucideIcon
  iconRight?: LucideIcon
  loading?: boolean
  children?: React.ReactNode
}

const Spinner = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('animate-spin', className)}
    aria-hidden
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="2.5"
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
)

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      iconLeft: IconLeft,
      iconRight: IconRight,
      loading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Spinner /> : IconLeft ? <IconLeft /> : null}
        {children}
        {!loading && IconRight ? <IconRight /> : null}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
