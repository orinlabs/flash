import { ChevronsUpDown, Moon, Search, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

interface TopBarProps {
  workspaceName?: string
  userInitials?: string
  theme?: 'light' | 'dark'
  onThemeToggle?: () => void
}

export function TopBar({
  workspaceName = 'ICP Prospector',
  userInitials = 'BH',
  theme = 'light',
  onThemeToggle
}: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg px-4">
      <BrandMark />
      <span className="text-ink-faint" aria-hidden>
        /
      </span>
      <button
        type="button"
        className={cn(
          'group inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-ink',
          'hover:bg-surface-muted transition-colors duration-120'
        )}
      >
        <span className="flex size-5 items-center justify-center rounded bg-ink text-[11px] font-semibold text-white">
          {workspaceName[0]}
        </span>
        <span className="font-medium">{workspaceName}</span>
        <ChevronsUpDown className="size-3 text-ink-faint" />
      </button>

      <div className="ml-2 flex flex-1 justify-center">
        <CommandInput />
      </div>

      <div className="flex items-center gap-1">
        {onThemeToggle ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onThemeToggle}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        ) : null}
        <UserAvatar initials={userInitials} />
      </div>
    </header>
  )
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2 pr-1">
      <div className="flex size-6 items-center justify-center rounded-md bg-ink">
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="7" cy="7" r="4" />
          <path d="M10 10 13.5 13.5" />
        </svg>
      </div>
      <span className="text-[13px] font-semibold tracking-tight">prospector</span>
    </div>
  )
}

function CommandInput() {
  return (
    <button
      type="button"
      className={cn(
        'group flex h-8 w-full max-w-md items-center gap-2 rounded-md border border-line bg-surface px-2.5 text-sm text-ink-faint',
        'hover:border-line-strong transition-colors duration-120'
      )}
      aria-label="Search"
    >
      <Search className="size-3.5" />
      <span className="flex-1 text-left">Search people, companies, crawls...</span>
      <span className="flex items-center gap-1">
        <Kbd>{String.fromCharCode(8984)}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  )
}

function UserAvatar({ initials }: { initials: string }) {
  return (
    <button
      type="button"
      className="ml-1 inline-flex size-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white ring-1 ring-line"
      aria-label="Account menu"
    >
      {initials.slice(0, 2)}
    </button>
  )
}
