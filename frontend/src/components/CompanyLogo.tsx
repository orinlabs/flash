import { Globe } from 'lucide-react'

import { faviconUrl } from '@/lib/format'
import { cn } from '@/lib/utils'

type CompanyLogoProps = {
  company: {
    domain?: string | null
    website?: string | null
  }
  className?: string
  placeholderClassName?: string
}

export function CompanyLogo({
  company,
  className = 'size-5 rounded-sm border border-line',
  placeholderClassName
}: CompanyLogoProps) {
  const src = faviconUrl(company.domain ?? company.website)
  if (!src) {
    return (
      <span
        className={cn(
          'grid place-items-center rounded-sm border border-line bg-surface-muted',
          placeholderClassName ?? className
        )}
        aria-hidden
      >
        <Globe className="size-3 text-ink-faint" />
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={(e) => {
        e.currentTarget.style.visibility = 'hidden'
      }}
    />
  )
}
