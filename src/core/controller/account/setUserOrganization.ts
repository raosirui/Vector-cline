import { UserOrganizationUpdateRequest } from "@shared/proto/cline/account"
import { Empty } from "@shared/proto/cline/common"
import type { Controller } from "../index"

/**
 * No-op: IC-AI does not support organization switching.
 */
export async function setUserOrganization(_controller: Controller, _request: UserOrganizationUpdateRequest): Promise<Empty> {
	return {}
}
