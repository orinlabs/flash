import { formatDistanceToNowStrict } from 'date-fns'

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function faviconUrl(domain: string | null | undefined): string | null {
  if (!domain) return null
  const cleaned = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!cleaned) return null
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(cleaned)}&sz=64`
}

export function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/.*$/, '') || null
  }
}

export function formatRelative(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return null
    return formatDistanceToNowStrict(d, { addSuffix: true })
      .replace(' seconds', 's')
      .replace(' second', 's')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd')
      .replace(' months', 'mo')
      .replace(' month', 'mo')
      .replace(' years', 'y')
      .replace(' year', 'y')
  } catch {
    return null
  }
}

export function formatUsd(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00'
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '$0.00'
  if (n === 0) return '$0.00'
  if (Math.abs(n) < 0.01) return `$${n.toFixed(4)}`
  if (Math.abs(n) < 1) return `$${n.toFixed(3)}`
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString()
}

export function formatTokens(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n) || n === 0) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
