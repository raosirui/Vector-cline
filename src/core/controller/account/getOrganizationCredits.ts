import { GetOrganizationCreditsRequest, OrganizationCreditsData } from "@shared/proto/cline/account"
import type { Controller } from "../index"

/**
 * No-op: IC-AI does not support organization-level credits.
 */
export async function getOrganizationCredits(
	_controller: Controller,
	_request: GetOrganizationCreditsRequest,
): Promise<OrganizationCreditsData> {
	return OrganizationCreditsData.create({
		balance: { currentBalance: 0 },
		organizationId: "",
		usageTransactions: [],
	})
}
