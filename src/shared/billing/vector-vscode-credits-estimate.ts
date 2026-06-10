/**
 * Client-side estimate for IC-AI Vector VSCode billing when settlement API fails (offline display).
 * Rates MUST match IC-AI `shared/billing/vector-vscode-pricing.ts` → VECTOR_VSCODE_MODEL_RATES / computeVectorVscodeCredits.
 */

import { normalizeVectorVscodeModelIdForBilling } from "./vector-vscode-model-id"

type Rates = { inputCreditsPerMillion: number; outputCreditsPerMillion: number }

/** Canonical id → rates (same keys as IC-AI after normalization). */
const VECTOR_VSCODE_MODEL_RATES: Record<string, Rates> = {
	"kimi-k2.5": { inputCreditsPerMillion: 4, outputCreditsPerMillion: 21 },
	"glm-4.7": { inputCreditsPerMillion: 4.3, outputCreditsPerMillion: 15.8 },
	"glm-5": { inputCreditsPerMillion: 7.2, outputCreditsPerMillion: 23 },
	"gpt-5.4": { inputCreditsPerMillion: 18, outputCreditsPerMillion: 108 },
	"gpt-5.5": { inputCreditsPerMillion: 36, outputCreditsPerMillion: 216 },
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
