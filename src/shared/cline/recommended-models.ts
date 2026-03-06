import { VECTOR_PROVIDER_MODEL_IDS } from "@shared/vector-provider"

export interface ClineRecommendedModel {
	id: string
	name: string
	description: string
	tags: string[]
}

export interface ClineRecommendedModelsData {
	recommended: ClineRecommendedModel[]
	free: ClineRecommendedModel[]
}

const vectorFallbackModels: ClineRecommendedModel[] = VECTOR_PROVIDER_MODEL_IDS.map((id) => ({
	id,
	name: id,
	description: "Vector Coding Plan model",
	tags: ["FREE"],
}))

/**
 * Hardcoded fallback shown when upstream recommended models are not enabled or unavailable.
 */
export const CLINE_RECOMMENDED_MODELS_FALLBACK: ClineRecommendedModelsData = {
	recommended: vectorFallbackModels,
	free: vectorFallbackModels,
}
