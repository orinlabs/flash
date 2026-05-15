export type OpenRouterReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'

export type OpenRouterReasoningConfig = {
  effort: OpenRouterReasoningEffort
}

const DISABLED_VALUES = new Set(['0', 'false', 'off', 'none', 'disabled'])
const VALID_EFFORTS = new Set<OpenRouterReasoningEffort>([
  'minimal',
  'low',
  'medium',
  'high'
])

export function openRouterReasoningConfig(): OpenRouterReasoningConfig | undefined {
  const raw = process.env.OPENROUTER_REASONING_EFFORT?.trim().toLowerCase()
  if (raw && DISABLED_VALUES.has(raw)) return undefined
  if (raw && VALID_EFFORTS.has(raw as OpenRouterReasoningEffort)) {
    return { effort: raw as OpenRouterReasoningEffort }
  }
  return { effort: 'medium' }
}
