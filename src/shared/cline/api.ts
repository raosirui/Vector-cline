export const ICAI_API_ENDPOINT = {
	EXTENSION_TOKEN: "/api/extension/token",
	USER_INFO: "/api/extension/user-info",
}

/**
 * @deprecated Use ICAI_API_ENDPOINT instead. Kept for backward compatibility with code that references these.
 */
export const CLINE_API_ENDPOINT = {
	AUTH: ICAI_API_ENDPOINT.EXTENSION_TOKEN,
	TOKEN_EXCHANGE: ICAI_API_ENDPOINT.EXTENSION_TOKEN,
	REFRESH_TOKEN: ICAI_API_ENDPOINT.EXTENSION_TOKEN,
	USER_INFO: ICAI_API_ENDPOINT.USER_INFO,
	ACTIVE_ACCOUNT: ICAI_API_ENDPOINT.USER_INFO,
	REMOTE_CONFIG: "/api/v1/organizations/{id}/remote-config",
	API_KEYS: "/api/v1/organizations/{id}/api-keys",
}
