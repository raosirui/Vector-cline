import type { ModelInfo } from "./api"
import { ApiFormat } from "./proto/cline/models"

export const VECTOR_PROVIDER_DEFAULT_MODEL_ID = "claude-sonnet-4-6"

export const VECTOR_PROVIDER_MODEL_IDS = [
	"claude-sonnet-4-6",
	"claude-sonnet-4-5",
	"claude-sonnet-4-5-20250929",
	"claude-haiku-4-5",
	"claude-haiku-4-5-20251001",
	"claude-opus-4-5",
	"kimi-k2.5",
	"glm-5",
	"glm-4.7",
] as const

export type VectorProviderRouteId = "nextopenai-anthropic" | "kimi-anthropic" | "glm-openai"

export interface VectorProviderRouteConfig {
	baseUrl: string
	apiKey: string
	apiFormat: ApiFormat
}

const VECTOR_PROVIDER_ROUTES: Record<VectorProviderRouteId, VectorProviderRouteConfig> = {
	"nextopenai-anthropic": {
		baseUrl: "https://api.nextopenai.com",
		apiKey: "sk-6vMnJZxuhjkSWGiJPwZMq9QGmh0oa0SW7S0E0X4aDnt4CNWk",
		apiFormat: ApiFormat.OPENAI_CHAT,
	},
	"kimi-anthropic": {
		baseUrl: "https://api.kimi.com/coding",
		apiKey: "sk-kimi-dxA0dvZr8bbXT6Eecd5V5fJBJ2SsFDa56pXtKGeRjF7xy1l1I2xINjEuU6Qdiguf",
		apiFormat: ApiFormat.ANTHROPIC_CHAT,
	},
	"glm-openai": {
		baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
		apiKey: "3c5e83619ac84c8194bf2b86d89a3c98.B9cVGLK4nv9aHaAU",
		apiFormat: ApiFormat.OPENAI_CHAT,
	},
}

const VECTOR_PROVIDER_MODEL_ROUTE_MAP: Partial<Record<string, VectorProviderRouteId>> = {
	"claude-sonnet-4-6": "nextopenai-anthropic",
	"claude-sonnet-4-5": "nextopenai-anthropic",
	"claude-sonnet-4-5-20250929": "nextopenai-anthropic",
	"claude-haiku-4-5": "nextopenai-anthropic",
	"claude-haiku-4-5-20251001": "nextopenai-anthropic",
	"claude-opus-4-5": "nextopenai-anthropic",
	"kimi-k2.5": "kimi-anthropic",
	"glm-5": "glm-openai",
	"glm-4.7": "glm-openai",
}

const vectorModelInfoDefaults: ModelInfo = {
	maxTokens: -1,
	contextWindow: 256_000,
	supportsImages: true,
	supportsPromptCache: false,
	inputPrice: 0,
	outputPrice: 0,
	description: "Vector Coding Plan model",
	apiFormat: ApiFormat.ANTHROPIC_CHAT,
}

export const VECTOR_PROVIDER_MODELS: Record<string, ModelInfo> = Object.fromEntries(
	VECTOR_PROVIDER_MODEL_IDS.map((modelId) => [
		modelId,
		{
			...vectorModelInfoDefaults,
			name: modelId,
			apiFormat: getVectorProviderRouteConfig(modelId).apiFormat,
			supportsStreaming: getVectorProviderRouteConfig(modelId).baseUrl !== "https://api.nextopenai.com",
		},
	]),
) as Record<string, ModelInfo>

function getRouteIdFromModelId(modelId: string): VectorProviderRouteId {
	const normalizedModelId = modelId.trim().toLowerCase()
	const explicitRoute = VECTOR_PROVIDER_MODEL_ROUTE_MAP[normalizedModelId]
	if (explicitRoute) {
		return explicitRoute
	}
	if (normalizedModelId.startsWith("kimi-")) {
		return "kimi-anthropic"
	}
	if (normalizedModelId.startsWith("glm-")) {
		return "glm-openai"
	}
	return "nextopenai-anthropic"
}

export function getVectorProviderRouteConfig(modelId?: string): VectorProviderRouteConfig {
	const fallbackModelId = VECTOR_PROVIDER_DEFAULT_MODEL_ID
	return VECTOR_PROVIDER_ROUTES[getRouteIdFromModelId(modelId || fallbackModelId)]
}
