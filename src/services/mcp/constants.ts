/**
 * Fallback when server config cannot be read. Per-server `timeout` (seconds) in
 * mcp settings should be used for list/connect operations; see McpHub.
 * Kept at 120s to match DEFAULT_MCP_TIMEOUT_SECONDS in @shared/mcp.
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 120_000

/**
 * Custom error message for better user feedback when server type validation fails.
 */
export const TYPE_ERROR_MESSAGE = "Server type must be one of: 'stdio', 'sse', or 'streamableHttp'"

/**
 * When MCP settings omit `protocolVersion`, remote transports use this in JSON-RPC `initialize`
 * (not HTTP headers — some gateways HTTP-500 on unsolicited `mcp-protocol-version`).
 * Older than SDK default negotiated version (2025-03-26).
 */
export const REMOTE_MCP_DEFAULT_PROTOCOL_VERSION = "2024-11-05"
