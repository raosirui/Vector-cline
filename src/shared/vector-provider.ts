import type { ModelInfo } from "./api"

export const VECTOR_PROVIDER_BASE_URL = "https://coding.dashscope.aliyuncs.com/v1"
export const VECTOR_PROVIDER_API_KEY = "sk-sp-1b5648ab851c4bcfbfb2cc56b813a9f6"
export const VECTOR_PROVIDER_DEFAULT_MODEL_ID = "qwen3.5-plus"

export const VECTOR_PROVIDER_MODEL_IDS = [
	"qwen3.5-plus",
	"kimi-k2.5",
	"glm-5",
	"MiniMax-M2.5",
	"qwen3-max-2026-01-23",
	"qwen3-coder-next",
	"qwen3-coder-plus",
	"glm-4.7",
] as const

const vectorModelInfoDefaults: ModelInfo = {
	maxTokens: -1,
	contextWindow: 256_000,
	supportsImages: true,
	supportsPromptCache: false,
	inputPrice: 0,
	outputPrice: 0,
	description: "Vector Coding Plan model (free)",
}

export const VECTOR_PROVIDER_MODELS: Record<string, ModelInfo> = Object.fromEntries(
	VECTOR_PROVIDER_MODEL_IDS.map((modelId) => [
		modelId,
		{
			...vectorModelInfoDefaults,
			name: modelId,
		},
	]),
) as Record<string, ModelInfo>
