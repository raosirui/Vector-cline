import { OrganizationCreditsData } from "@shared/proto/cline/account"

/**
 * No-op: IC-AI does not support organization-level credits.
 */
export async function getOrganizationCredits(_controller, _request) {
	return OrganizationCreditsData.create({
		balance: { currentBalance: 0 },
		organizationId: "",
		usageTransactions: [],
	})
}
//# sourceMappingURL=getOrganizationCredits.js.map
