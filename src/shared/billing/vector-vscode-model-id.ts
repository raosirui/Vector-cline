/**
 * Normalizes Vector Coding / VSCode extension model IDs for IC-AI `vector-token-usage` billing.
 * Logic MUST stay aligned with IC-AI `shared/billing/vector-vscode-pricing.ts` → normalizeVectorVscodeModelId.
 */

const VECTOR_VSCODE_MODEL_EXPLICIT_ALIASES: Record<string, string> = {
	"z-ai/glm-5": "glm-5",
	"z-ai/glm-4.7": "glm-4.7",
}

/**
 * Maps vendor-prefixed or alternate-format IDs to canonical VECTOR_VSCODE_MODEL_RATES keys on IC-AI.
 */
export function normalizeVectorVscodeModelIdForBilling(modelId: string): string {
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
		(_, role: string, major: string, minor: string, dated?: string) => `claude-${role}-${major}-${minor}${dated ?? ""}`,
	)
	if (claudeDotToHyphen !== s) {
		return claudeDotToHyphen
	}

	return s
}
