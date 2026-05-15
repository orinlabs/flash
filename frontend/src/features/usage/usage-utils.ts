export type RangeOption = { id: string; label: string; days: number | null }

export const RANGES: RangeOption[] = [
  { id: '24h', label: '24h', days: 1 },
  { id: '7d', label: '7d', days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: 'all', label: 'All time', days: null }
]

export function numberValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : 0
}

export function ratio(numerator: string | number | null | undefined, denominator: number): number {
  if (denominator <= 0) return 0
  return numberValue(numerator) / denominator
}

function normalize(value: string | number | null | undefined): string {
  return String(value ?? '').toLowerCase()
}

export function matchesQuery(query: string, values: Array<string | number | null | undefined>) {
  if (!query) return true
  return values.some((value) => normalize(value).includes(query))
}
