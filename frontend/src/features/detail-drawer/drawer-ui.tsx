import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Company } from '@/api'
import { CompanyLogo } from '@/components/CompanyLogo'
import { cn } from '@/lib/utils'

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs uppercase tracking-wide text-ink-faint">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <header className="border-b border-line bg-surface px-4 py-2 text-2xs font-medium uppercase tracking-wide text-ink-faint">
        {title}
      </header>
      <div className="px-4 py-2">{children}</div>
    </section>
  )
}

export function KV({
  label,
  value,
  mono
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  if (value === null || value === undefined || value === '') {
    return (
      <div className="grid grid-cols-[100px_1fr] gap-3 border-b border-line py-2 last:border-b-0">
        <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
        <dd className="text-sm text-ink-faint">-</dd>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[100px_1fr] items-start gap-3 border-b border-line py-2 last:border-b-0">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd
        className={cn(
          'min-w-0 text-sm text-ink',
          mono && 'font-mono text-[12.5px] text-ink-muted'
        )}
      >
        {value}
      </dd>
    </div>
  )
}

export function ExternalAnchor({
  href,
  children
}: {
  href: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 underline-offset-4 hover:text-accent hover:underline"
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  )
}

export function CompanyFavicon({ company }: { company: Company }) {
  return (
    <CompanyLogo
      company={company}
      className="size-8 rounded-md border border-line"
      placeholderClassName="size-8 rounded-md"
    />
  )
}

export function EmptyTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-xs text-sm text-ink-muted">{description}</p>
    </div>
  )
}
