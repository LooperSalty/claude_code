/**
 * Cost tracker - tracks token usage and estimated costs.
 * Inspired by src/cost-tracker.ts
 */

// Pricing per million tokens (approximate, Sonnet 4)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
  'claude-haiku-4-20250514': { input: 0.80, output: 4.0 },
}

const DEFAULT_PRICING = { input: 3.0, output: 15.0 }

export interface CostState {
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  turnCount: number
}

export function createCostTracker() {
  const state: CostState = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    turnCount: 0,
  }

  return {
    addUsage(model: string, inputTokens: number, outputTokens: number) {
      const pricing = PRICING[model] ?? DEFAULT_PRICING
      const cost =
        (inputTokens / 1_000_000) * pricing.input +
        (outputTokens / 1_000_000) * pricing.output

      state.totalInputTokens += inputTokens
      state.totalOutputTokens += outputTokens
      state.totalCostUsd += cost
      state.turnCount += 1
    },

    getState(): Readonly<CostState> {
      return { ...state }
    },

    formatCost(): string {
      return [
        `Tokens: ${state.totalInputTokens.toLocaleString()} in / ${state.totalOutputTokens.toLocaleString()} out`,
        `Cost:   $${state.totalCostUsd.toFixed(4)}`,
        `Turns:  ${state.turnCount}`,
      ].join('\n')
    },
  }
}
