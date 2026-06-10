import { UsageTransaction as PbUsageTransaction, UserCreditsData } from "@shared/proto/cline/account"
import type { EmptyRequest } from "@shared/proto/cline/common"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from "../index"

/**
 * Handles fetching user credits data from IC-AI.
 * IC-AI returns remainingCredits as real credits (same numeric values as PostgreSQL NUMERIC).
 */
export async function getUserCredits(controller: Controller, _request: EmptyRequest): Promise<UserCreditsData> {
	try {
		if (!controller.accountService) {
			throw new Error("Account service not available")
		}

		const [balance, usageTransactions] = await Promise.all([
			controller.accountService.fetchBalanceRPC(),
			controller.accountService.fetchUsageTransactionsRPC(),
		])

		if (balance === undefined) {
			throw new Error("Failed to fetch user credits data")
		}

		const fetchedBalance = balance.balance
		if (typeof fetchedBalance === "number" && Number.isFinite(fetchedBalance)) {
			const current = controller.stateManager.getGlobalStateKey("icAiCreditsBalance")
			// Sync extension state after recharge; never overwrite a lower post-settlement balance with stale server data.
			if (typeof current !== "number" || !Number.isFinite(current) || fetchedBalance > current) {
				controller.stateManager.setGlobalState("icAiCreditsBalance", fetchedBalance)
			}
		}

		const protoUsage = (usageTransactions ?? []).map((t) =>
			PbUsageTransaction.create({
				aiInferenceProviderName: t.aiInferenceProviderName,
				aiModelName: t.aiModelName,
				aiModelTypeName: t.aiModelTypeName,
				completionTokens: Math.min(Math.max(0, t.completionTokens), 2_147_483_647),
				costUsd: t.costUsd,
				createdAt: t.createdAt,
				creditsUsed: t.creditsUsed,
				generationId: t.generationId,
				organizationId: t.organizationId,
				promptTokens: Math.min(Math.max(0, t.promptTokens), 2_147_483_647),
				totalTokens: Math.min(Math.max(0, t.totalTokens), 2_147_483_647),
				userId: t.userId,
				operation: t.operation ?? "",
			}),
		)

		return UserCreditsData.create({
			balance: { currentBalance: balance.balance },
			usageTransactions: protoUsage,
			paymentTransactions: [],
		})
	} catch (error) {
		Logger.error(`Failed to fetch user credits data: ${error}`)
		throw error
	}
}
