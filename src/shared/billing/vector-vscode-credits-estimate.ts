/**
 * Client-side estimate for IC-AI Vector VSCode billing when settlement API fails (offline display).
 * Rates MUST match IC-AI `shared/billing/vector-vscode-pricing.ts` → VECTOR_VSCODE_MODEL_RATES / computeVectorVscodeCredits.
 */

import { normalizeVectorVscodeModelIdForBilling } from "./vector-vscode-model-id"

type Rates = { inputCreditsPerMillion: number; outputCreditsPerMillion: number }

const SONNET_46: Rates = { inputCreditsPerMillion: 21, outputCreditsPerMillion: 105 }

/** Canonical id → rates (same keys as IC-AI after normalization). */
const VECTOR_VSCODE_MODEL_RATES: Record<string, Rates> = {
	"claude-sonnet-4-6": SONNET_46,
	"claude-sonnet-4-5": SONNET_46,
	"claude-sonnet-4-5-20250929": SONNET_46,
	"claude-haiku-4-5": SONNET_46,
	"claude-haiku-4-5-20251001": SONNET_46,
	"claude-opus-4-5": SONNET_46,
	"kimi-k2.5": { inputCreditsPerMillion: 4, outputCreditsPerMillion: 21 },
	"glm-4.7": { inputCreditsPerMillion: 4, outputCreditsPerMillion: 16 },
	"glm-5": { inputCreditsPerMillion: 6, outputCreditsPerMillion: 22 },
}

/**
 * Returns estimated credits charged for this request, or undefined if model is unknown.
 */
export function estimateVectorVscodeCredits(modelId: string, inputTokens: number, outputTokens: number): number | undefined {
	const id = normalizeVectorVscodeModelIdForBilling(modelId)
	const rates = VECTOR_VSCODE_MODEL_RATES[id]
	if (!rates) {
		return undefined
	}
	const input = Math.max(0, Number(inputTokens) || 0)
	const output = Math.max(0, Number(outputTokens) || 0)
	const raw = (input / 1_000_000) * rates.inputCreditsPerMillion + (output / 1_000_000) * rates.outputCreditsPerMillion
	return Math.round(raw * 100_000_000) / 100_000_000
}
