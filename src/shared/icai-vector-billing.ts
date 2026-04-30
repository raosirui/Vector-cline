/**
 * Client-side mirror of IC-AI `vector-vscode-pricing` normalization.
 * Keep in sync with IC-AI `src/shared/billing/vector-vscode-pricing.ts`.
 */

const VECTOR_VSCODE_MODEL_EXPLICIT_ALIASES: Record<string, string> = {
	"z-ai/glm-5": "glm-5",
	"z-ai/glm-4.7": "glm-4.7",
}

/** Canonical rate-card keys (must match IC-AI VECTOR_VSCODE_MODEL_RATES). */
const BILLABLE_MODEL_KEYS = new Set([
	"claude-sonnet-4-6",
	"claude-sonnet-4-5",
	"claude-sonnet-4-5-20250929",
	"claude-haiku-4-5",
	"claude-haiku-4-5-20251001",
	"claude-opus-4-5",
	"kimi-k2.5",
	"glm-4.7",
	"glm-5",
])

export function normalizeVectorVscodeModelId(modelId: string): string {
	let s = modelId.trim().toLowerCase()
	if (!s) {
		return s
	}

	const explicit = VECTOR_VSCODE_MODEL_EXPLICIT_ALIASES[s]
	if (explicit) {
		return explicit
	}

	const slashIdx = s.lastIndexOf("/")
	if (slashIdx !== -1) {
		s = s.slice(slashIdx + 1)
	}

	const claudeDotToHyphen = s.replace(
		/^claude-(sonnet|haiku|opus)-(\d+)\.(\d+)(-[0-9]{8})?$/,
		(_, role: string, major: string, minor: string, dated?: string) =>
			`claude-${role}-${major}-${minor}${dated ?? ""}`,
	)
	if (claudeDotToHyphen !== s) {
		return claudeDotToHyphen
	}

	return s
}

export function isBillableVectorVscodeModel(modelId: string): boolean {
	return BILLABLE_MODEL_KEYS.has(normalizeVectorVscodeModelId(modelId))
}

/** Prompt-side + completion tokens for IC-AI settlement (matches ContextWindowSummary-style totals). */
export function billingTokensForIcaiSettlement(metrics: {
	inputTokens: number
	outputTokens: number
	cacheWriteTokens: number
	cacheReadTokens: number
}): { inputTokens: number; outputTokens: number } {
	const inputTokens = Math.min(
		2_000_000_000,
		Math.max(0, Math.floor(metrics.inputTokens + metrics.cacheWriteTokens + metrics.cacheReadTokens)),
	)
	const outputTokens = Math.min(2_000_000_000, Math.max(0, Math.floor(metrics.outputTokens)))
	return { inputTokens, outputTokens }
}
