export type RemoteMcpTransportType = "streamableHttp" | "sse"

export interface BuiltInRemoteMcpPreset {
	id: string
	displayName: string
	description: string
	serverName: string
	serverUrl: string
	transportType: RemoteMcpTransportType
}

export interface BuiltInRemoteMcpServerConfig {
	url: string
	type: RemoteMcpTransportType
	disabled: boolean
	autoApprove: string[]
}

export const builtInRemoteMcpPresets: BuiltInRemoteMcpPreset[] = [
	{
		id: "NSSine-NS800RT",
		displayName: "NSSine-NS800RT",
		description: "Built-in remote MCP preset for the NS800RT endpoint.",
		serverName: "NSSine-NS800RT",
		serverUrl: "http://156.224.28.114/mcp/server/r2srNIgK3mM6Pb4t/mcp",
		transportType: "streamableHttp",
	},
]

export function getBuiltInRemoteMcpServerEntries(): Record<string, BuiltInRemoteMcpServerConfig> {
	return Object.fromEntries(
		builtInRemoteMcpPresets.map((preset) => [
			preset.serverName,
			{
				url: preset.serverUrl,
				type: preset.transportType,
				disabled: false,
				autoApprove: [],
			},
		]),
	)
}

export function isBuiltInRemoteMcpServer(serverName: string): boolean {
	return builtInRemoteMcpPresets.some((preset) => preset.serverName === serverName)
}

export function mergeBuiltInRemoteMcpServers(
	existingServers: Record<string, unknown> = {},
): Record<string, Record<string, unknown>> {
	const mergedServers: Record<string, Record<string, unknown>> = {
		...Object.fromEntries(
			Object.entries(existingServers).map(([serverName, config]) => [
				serverName,
				typeof config === "object" && config !== null ? { ...(config as Record<string, unknown>) } : {},
			]),
		),
	}

	for (const preset of builtInRemoteMcpPresets) {
		const existingConfig = mergedServers[preset.serverName] ?? {}
		mergedServers[preset.serverName] = {
			disabled: typeof existingConfig.disabled === "boolean" ? existingConfig.disabled : false,
			autoApprove: Array.isArray(existingConfig.autoApprove)
				? existingConfig.autoApprove.filter((value): value is string => typeof value === "string")
				: [],
			...(typeof existingConfig.timeout === "number" ? { timeout: existingConfig.timeout } : {}),
			...(existingConfig.headers && typeof existingConfig.headers === "object" && !Array.isArray(existingConfig.headers)
				? { headers: existingConfig.headers }
				: {}),
			url: preset.serverUrl,
			type: preset.transportType,
		}
	}

	return mergedServers
}
