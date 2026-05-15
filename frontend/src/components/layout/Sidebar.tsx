import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface SidebarItem<TId extends string = string> {
  id: TId
  label: string
  icon: LucideIcon
  badge?: React.ReactNode
}

export interface SidebarSection<TId extends string = string> {
  label?: string
  items: SidebarItem<TId>[]
}

interface SidebarProps<TId extends string> {
  sections: SidebarSection<TId>[]
  activeId: TId
  onSelect: (id: TId) => void
  footer?: React.ReactNode
}

export function Sidebar<TId extends string>({
  sections,
  activeId,
  onSelect,
  footer
}: SidebarProps<TId>) {
  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-line bg-bg">
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className={cn(sectionIdx > 0 && 'mt-5')}>
            {section.label ? (
              <div className="px-2 pb-1.5 text-2xs font-medium uppercase tracking-wide text-ink-faint">
                {section.label}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const selected = item.id === activeId
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      aria-current={selected ? 'page' : undefined}
                      className={cn(
                        'group relative flex h-8 w-full items-center gap-2 rounded-md pl-2.5 pr-2 text-sm transition-colors duration-120',
                        selected
                          ? 'bg-surface text-ink ring-1 ring-line'
                          : 'text-ink-muted hover:bg-surface/70 hover:text-ink'
                      )}
                    >
                      {selected ? (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-accent"
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          'size-3.5 shrink-0',
                          selected ? 'text-ink' : 'text-ink-faint group-hover:text-ink-muted'
                        )}
                      />
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      {item.badge ? <span className="shrink-0">{item.badge}</span> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      {footer ? (
        <div className="border-t border-line px-3 py-3">{footer}</div>
      ) : null}
    </aside>
  )
}
