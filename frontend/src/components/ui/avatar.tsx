import { useState } from 'react'

import { cn } from '@/lib/utils'

interface AvatarProps {
  name?: string | null
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'size-6 text-[10px]',
  md: 'size-7 text-[11px]',
  lg: 'size-10 text-sm'
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [errored, setErrored] = useState(false)
  const showImage = src && !errored
  const initials = (name ?? '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-muted font-semibold text-ink-muted',
        sizeMap[size],
        className
      )}
      aria-hidden
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          className="size-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span>{initials || '?'}</span>
      )}
    </div>
  )
}
