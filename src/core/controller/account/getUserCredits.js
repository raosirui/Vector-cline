import { UserCreditsData } from "@shared/proto/cline/account"
import { Logger } from "@/shared/services/Logger"
/**
 * Handles fetching user credits data from IC-AI.
 */
export async function getUserCredits(controller, _request) {
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
//# sourceMappingURL=getUserCredits.js.map
