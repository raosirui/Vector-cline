import { UserCreditsData } from "@shared/proto/cline/account"
import type { EmptyRequest } from "@shared/proto/cline/common"
import { Logger } from "@/shared/services/Logger"
import type { Controller } from "../index"

/**
 * Handles fetching user credits data from IC-AI.
 * IC-AI returns credits as a simple integer (remainingCredits),
 * not in microcredits, so no division is needed.
 */
export async function getUserCredits(controller: Controller, _request: EmptyRequest): Promise<UserCreditsData> {
	try {
		if (!controller.accountService) {
			throw new Error("Account service not available")
		}

		const balance = await controller.accountService.fetchBalanceRPC()

		if (balance === undefined) {
			throw new Error("Failed to fetch user credits data")
		}

		return UserCreditsData.create({
			balance: { currentBalance: balance.balance },
			usageTransactions: [],
			paymentTransactions: [],
		})
	} catch (error) {
		Logger.error(`Failed to fetch user credits data: ${error}`)
		throw error
	}
}
