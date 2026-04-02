import { createHash } from "node:crypto"

/**
 * Identifier for the MCP tools that are used in native tool calls,
 * where each tool name is the combination of the server name + identifier + tool name.
 * This enables to uniquely identify which MCP server a tool belongs to.
 */
export const CLINE_MCP_TOOL_IDENTIFIER = "0mcp0"

/**
 * Byte length of MCP server uid keys from {@link McpHub} (`c` + nanoid(5)).
 * Used to parse native composite tool names without ambiguous delimiter splits.
 */
export const MCP_NATIVE_TOOL_SERVER_KEY_LENGTH = 6

const OPENAI_STYLE_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

/**
 * Builds the MCP tool name segment placed after uid + {@link CLINE_MCP_TOOL_IDENTIFIER}
 * so the full composite matches OpenAI/Codex tool name rules (`^[a-zA-Z0-9_-]+$`).
 * When the raw MCP tool name contains other characters, returns a stable surrogate segment
 * and `realNameForAlias` so the hub can map back to the real tool name at execution time.
 */
export function buildMcpNativeToolOpenApiSegment(rawToolName: string): {
	apiSegment: string
	realNameForAlias?: string
} {
	if (rawToolName && OPENAI_STYLE_TOOL_NAME_PATTERN.test(rawToolName)) {
		return { apiSegment: rawToolName }
	}
	const hash = createHash("sha256").update(rawToolName, "utf8").digest("hex").slice(0, 8)
	let safe = rawToolName.replace(/[^a-zA-Z0-9_-]/g, "_")
	safe = safe.replace(/_+/g, "_").replace(/^_|_$/g, "")
	if (!safe) {
		safe = "tool"
	}
	if (safe.length > 32) {
		safe = safe.slice(0, 32)
	}
	return {
		apiSegment: `${safe}_m${hash}`,
		realNameForAlias: rawToolName,
	}
}

/**
 * Parses composite native MCP tool names: `{serverUid}{@link CLINE_MCP_TOOL_IDENTIFIER}{toolSegment}`.
 * Prefers fixed-width parsing when the uid matches {@link MCP_NATIVE_TOOL_SERVER_KEY_LENGTH}.
 */
export function parseMcpNativeCompositeToolName(composite: string): { serverKey: string; toolName: string } | undefined {
	const delim = CLINE_MCP_TOOL_IDENTIFIER
	const minLen = MCP_NATIVE_TOOL_SERVER_KEY_LENGTH + delim.length
	if (composite.length >= minLen) {
		const at = MCP_NATIVE_TOOL_SERVER_KEY_LENGTH
		if (composite.slice(at, at + delim.length) === delim) {
			return {
				serverKey: composite.slice(0, at),
				toolName: composite.slice(at + delim.length),
			}
		}
	}
	const idx = composite.indexOf(delim)
	if (idx > 0) {
		return {
			serverKey: composite.slice(0, idx),
			toolName: composite.slice(idx + delim.length),
		}
	}
	return undefined
}
export const DEFAULT_MCP_TIMEOUT_SECONDS = 120
export const MIN_MCP_TIMEOUT_SECONDS = 1
export type McpMode = "full" | "server-use-only" | "off"

export type McpServer = {
	name: string
	config: string
	status: "connected" | "connecting" | "disconnected"
	error?: string
	tools?: McpTool[]
	resources?: McpResource[]
	resourceTemplates?: McpResourceTemplate[]
	prompts?: McpPrompt[]
	disabled?: boolean
	timeout?: number
	uid?: string
	oauthRequired?: boolean
	oauthAuthStatus?: McpOAuthAuthStatus
}

export type McpOAuthAuthStatus = "authenticated" | "unauthenticated" | "pending"

export type McpTool = {
	name: string
	description?: string
	inputSchema?: object
	autoApprove?: boolean
}

export type McpResource = {
	uri: string
	name: string
	mimeType?: string
	description?: string
}

export type McpResourceTemplate = {
	uriTemplate: string
	name: string
	description?: string
	mimeType?: string
}

export type McpPromptArgument = {
	name: string
	description?: string
	required?: boolean
}

export type McpPrompt = {
	name: string
	title?: string
	description?: string
	arguments?: McpPromptArgument[]
}

export type McpPromptMessageContent =
	| {
			type: "text"
			text: string
	  }
	| {
			type: "image"
			data: string
			mimeType: string
	  }
	| {
			type: "audio"
			data: string
			mimeType: string
	  }
	| {
			type: "resource"
			resource: {
				uri: string
				mimeType?: string
				text?: string
				blob?: string
			}
	  }

export type McpPromptMessage = {
	role: "user" | "assistant"
	content: McpPromptMessageContent
}

export type McpPromptResponse = {
	description?: string
	messages: McpPromptMessage[]
}

export type McpResourceResponse = {
	_meta?: Record<string, any>
	contents: Array<{
		uri: string
		mimeType?: string
		text?: string
		blob?: string
	}>
}

export type McpToolCallResponse = {
	_meta?: Record<string, any>
	content: Array<
		| {
				type: "text"
				text: string
		  }
		| {
				type: "image"
				data: string
				mimeType: string
		  }
		| {
				type: "audio"
				data: string
				mimeType: string
		  }
		| {
				type: "resource"
				resource: {
					uri: string
					mimeType?: string
					text?: string
					blob?: string
				}
		  }
		| {
				type: "resource_link"
				uri: string
				name?: string
				description?: string
				mimeType?: string
		  }
	>
	isError?: boolean
}

export interface McpMarketplaceItem {
	mcpId: string
	githubUrl: string
	name: string
	author: string
	description: string
	codiconIcon: string
	logoUrl: string
	category: string
	tags: string[]
	requiresApiKey: boolean
	readmeContent?: string
	llmsInstallationContent?: string
	isRecommended: boolean
	githubStars: number
	downloadCount: number
	createdAt: string
	updatedAt: string
	lastGithubSync: string
}

export interface McpMarketplaceCatalog {
	items: McpMarketplaceItem[]
}

export interface McpDownloadResponse {
	mcpId: string
	githubUrl: string
	name: string
	author: string
	description: string
	readmeContent: string
	llmsInstallationContent: string
	requiresApiKey: boolean
}

export type McpViewTab = "marketplace" | "addRemote" | "configure"
