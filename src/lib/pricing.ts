/**
 * Rough USD pricing used as a fallback when a provider does not return cost in
 * its response. These are intentionally a single source of truth so the user
 * can adjust them in one place.
 *
 * OpenRouter pricing is per 1M tokens. Exa pricing is per single API call /
 * per result, depending on the operation. Numbers are best-effort estimates
 * and should be treated as approximate.
 */

export type ModelPricing = {
  inputPerMillion: number
  outputPerMillion: number
}

const DEFAULT_MODEL_PRICING: ModelPricing = {
  inputPerMillion: 0.5,
  outputPerMillion: 2.0
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'openai/gpt-5-mini': { inputPerMillion: 0.25, outputPerMillion: 2.0 },
  'openai/gpt-5': { inputPerMillion: 1.25, outputPerMillion: 10.0 },
  'openai/gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'openai/gpt-4o': { inputPerMillion: 2.5, outputPerMillion: 10.0 },
  'anthropic/claude-3.5-sonnet': { inputPerMillion: 3.0, outputPerMillion: 15.0 },
  'anthropic/claude-3.5-haiku': { inputPerMillion: 0.8, outputPerMillion: 4.0 }
}

export function getModelPricing(model: string | null | undefined): ModelPricing {
  if (!model) return DEFAULT_MODEL_PRICING
  return MODEL_PRICING[model] ?? DEFAULT_MODEL_PRICING
}

export function estimateChatCostUsd(
  model: string | null | undefined,
  promptTokens: number,
  completionTokens: number
): number {
  const p = getModelPricing(model)
  const inputCost = (promptTokens / 1_000_000) * p.inputPerMillion
  const outputCost = (completionTokens / 1_000_000) * p.outputPerMillion
  return inputCost + outputCost
}

/**
 * Exa pricing is roughly:
 *  - $5 per 1k searches with default contents (highlights/summary)  → $0.005 / call
 *  - $1 per 1k contents requests                                    → $0.001 / call
 * These are used as fallbacks for visibility; treat as approximate.
 */
export const EXA_SEARCH_COST_USD = 0.005
export const EXA_CONTENTS_COST_USD = 0.001
