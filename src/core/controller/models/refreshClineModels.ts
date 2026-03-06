import type { ModelInfo } from "@shared/api"
import { StateManager } from "@/core/storage/StateManager"
import { VECTOR_PROVIDER_MODELS } from "@/shared/vector-provider"
import type { Controller } from ".."

/**
 * Core function: Refreshes the Cline models and returns application types
 * @param controller The controller instance
 * @returns Record of model ID to ModelInfo (application types)
 */
export async function refreshClineModels(controller: Controller): Promise<Record<string, ModelInfo>> {
	void controller
	const models: Record<string, ModelInfo> = { ...VECTOR_PROVIDER_MODELS }
	StateManager.get().setModelsCache("cline", models)
	return models
}

/**
 * Read cached Cline models from disk
 * @returns The cached models or undefined if not found
 */
export async function readClineModelsFromCache(): Promise<Record<string, ModelInfo> | undefined> {
	return { ...VECTOR_PROVIDER_MODELS }
}
