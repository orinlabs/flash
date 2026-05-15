import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

const Drawer = DialogPrimitive.Root
const DrawerTrigger = DialogPrimitive.Trigger
const DrawerClose = DialogPrimitive.Close
const DrawerPortal = DialogPrimitive.Portal

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]',
      'data-[state=open]:animate-overlayIn data-[state=closed]:animate-overlayOut',
      className
    )}
    {...props}
  />
))
DrawerOverlay.displayName = 'DrawerOverlay'

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    width?: string
  }
>(({ className, children, width = '480px', ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full max-w-[100vw] flex-col border-l border-line bg-surface shadow-elevated',
        'data-[state=open]:animate-drawerIn data-[state=closed]:animate-drawerOut',
        'focus:outline-none',
        className
      )}
      style={{ width }}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DrawerPortal>
))
DrawerContent.displayName = 'DrawerContent'

interface DrawerHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  monogram?: string
  actions?: React.ReactNode
}

function DrawerHeader({
  eyebrow,
  title,
  subtitle,
  monogram,
  actions,
  className,
  ...props
}: DrawerHeaderProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-start gap-3 border-b border-line px-5 py-4',
        className
      )}
      {...props}
    >
      {monogram ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line bg-surface-muted text-sm font-semibold text-ink">
          {monogram.slice(0, 2).toUpperCase()}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <DialogPrimitive.Description asChild>
            <p className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
              {eyebrow}
            </p>
          </DialogPrimitive.Description>
        ) : null}
        <DialogPrimitive.Title asChild>
          <h2 className="truncate text-[18px] font-semibold tracking-tight">{title}</h2>
        </DialogPrimitive.Title>
        {subtitle ? (
          <p className="truncate text-sm text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        <DrawerClose
          className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
          aria-label="Close"
        >
          <X className="size-4" />
        </DrawerClose>
      </div>
    </div>
  )
}

function DrawerBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('min-h-0 flex-1 overflow-y-auto bg-bg p-5', className)}
      {...props}
    />
  )
}

const DrawerTabs = TabsPrimitive.Root

const DrawerTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'flex h-10 shrink-0 items-center gap-1 border-b border-line bg-surface px-3',
      className
    )}
    {...props}
  />
))
DrawerTabsList.displayName = 'DrawerTabsList'

const DrawerTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative inline-flex h-10 items-center px-3 text-sm font-medium text-ink-muted transition-colors',
      'hover:text-ink',
      'data-[state=active]:text-ink',
      'after:absolute after:inset-x-3 after:-bottom-px after:h-px after:bg-transparent',
      'data-[state=active]:after:bg-ink',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
      className
    )}
    {...props}
  />
))
DrawerTabsTrigger.displayName = 'DrawerTabsTrigger'

const DrawerTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('focus-visible:outline-none', className)}
    {...props}
  />
))
DrawerTabsContent.displayName = 'DrawerTabsContent'

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerTabs,
  DrawerTabsList,
  DrawerTabsTrigger,
  DrawerTabsContent
}
