import type { OpenAiCompatibleModelInfo } from "./api"
import { ApiFormat } from "./proto/cline/models"

export const VECTOR_PROVIDER_DEFAULT_MODEL_ID = "kimi-k2.5"

export const VECTOR_PROVIDER_MODEL_IDS = ["kimi-k2.5", "glm-5", "glm-4.7", "gpt-5.4", "gpt-5.5"] as const

export type VectorProviderRouteId = "kimi-anthropic" | "glm-openai" | "harveycodeai-openai"

export interface VectorProviderRouteConfig {
	baseUrl: string
	apiKey: string
	apiFormat: ApiFormat
}

const VECTOR_PROVIDER_ROUTES: Record<VectorProviderRouteId, VectorProviderRouteConfig> = {
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
	"harveycodeai-openai": {
		baseUrl: "https://harveycodeai.com/v1",
		apiKey: "sk-CbKOpC1L5Xfypt2ikScQF9UyfiFMQCG7xZjnGdEtEwIqSaBn",
		apiFormat: ApiFormat.OPENAI_CHAT,
	},
}

const VECTOR_PROVIDER_MODEL_ROUTE_MAP: Partial<Record<string, VectorProviderRouteId>> = {
	"kimi-k2.5": "kimi-anthropic",
	"glm-5": "glm-openai",
	"glm-4.7": "glm-openai",
	"gpt-5.4": "harveycodeai-openai",
	"gpt-5.5": "harveycodeai-openai",
}

const vectorModelInfoDefaults: OpenAiCompatibleModelInfo = {
	maxTokens: -1,
	contextWindow: 256_000,
	supportsImages: true,
	supportsPromptCache: false,
	inputPrice: 0,
	outputPrice: 0,
	description: "Vector Coding Plan model",
	apiFormat: ApiFormat.ANTHROPIC_CHAT,
	supportsStreaming: true,
}

export const VECTOR_PROVIDER_MODELS: Record<string, OpenAiCompatibleModelInfo> = Object.fromEntries(
	VECTOR_PROVIDER_MODEL_IDS.map((modelId) => [
		modelId,
		{
			...vectorModelInfoDefaults,
			name: modelId,
			apiFormat: getVectorProviderRouteConfig(modelId).apiFormat,
			supportsStreaming: true,
		},
	]),
) as Record<string, OpenAiCompatibleModelInfo>

const VECTOR_PROVIDER_MODEL_ID_SET = new Set<string>(VECTOR_PROVIDER_MODEL_IDS)

export function isVectorProviderModelId(modelId: string | undefined): boolean {
	if (!modelId) {
		return false
	}
	return VECTOR_PROVIDER_MODEL_ID_SET.has(modelId.trim().toLowerCase())
}

export function resolveVectorProviderModelId(modelId?: string): string {
	const normalized = modelId?.trim().toLowerCase()
	if (normalized && VECTOR_PROVIDER_MODEL_ID_SET.has(normalized)) {
		return normalized
	}
	return VECTOR_PROVIDER_DEFAULT_MODEL_ID
}

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
	if (normalizedModelId.startsWith("gpt-")) {
		return "harveycodeai-openai"
	}
	return "kimi-anthropic"
}

export function getVectorProviderRouteConfig(modelId?: string): VectorProviderRouteConfig {
	const resolvedModelId = resolveVectorProviderModelId(modelId)
	return VECTOR_PROVIDER_ROUTES[getRouteIdFromModelId(resolvedModelId)]
}
