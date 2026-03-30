import { Client, type ClientOptions } from "@modelcontextprotocol/sdk/client/index.js"
import type { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js"
import { Protocol } from "@modelcontextprotocol/sdk/shared/protocol.js"
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import { InitializeResultSchema, LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from "@modelcontextprotocol/sdk/types.js"

export type ConfigurableMcpClientOptions = ClientOptions & {
	/** Version sent in the JSON-RPC `initialize` request (negotiation). */
	requestedInitializeProtocolVersion?: string
}

type ClientInternals = {
	_capabilities: Record<string, unknown>
	_clientInfo: { name: string; version: string }
	_pendingListChangedConfig: unknown
	_setupListChangedHandlers: (config: unknown) => void
	_serverCapabilities: unknown
	_serverVersion: unknown
	_instructions: unknown
}

/**
 * MCP SDK {@link Client} always requests {@link LATEST_PROTOCOL_VERSION} in `initialize`.
 * Many remote gateways return HTTP 500 on unknown versions; this subclass uses a configurable
 * requested version (defaulting to LATEST when not passed from {@link ConfigurableMcpClientOptions}).
 */
export class ConfigurableMcpClient extends Client {
	private readonly requestedInitializeProtocolVersion: string

	constructor(clientInfo: ConstructorParameters<typeof Client>[0], options?: ConfigurableMcpClientOptions) {
		const { requestedInitializeProtocolVersion, ...clientOptions } = options ?? {}
		super(clientInfo, clientOptions)
		this.requestedInitializeProtocolVersion = requestedInitializeProtocolVersion ?? LATEST_PROTOCOL_VERSION
	}

	override async connect(transport: Transport, options?: RequestOptions): Promise<void> {
		await Protocol.prototype.connect.call(this, transport)
		if (transport.sessionId !== undefined) {
			return
		}
		try {
			const self = this as unknown as ClientInternals
			const result = await this.request(
				{
					method: "initialize",
					params: {
						protocolVersion: this.requestedInitializeProtocolVersion,
						capabilities: self._capabilities,
						clientInfo: self._clientInfo,
					},
				},
				InitializeResultSchema,
				options,
			)
			if (result === undefined) {
				throw new Error(`Server sent invalid initialize result: ${result}`)
			}
			if (!SUPPORTED_PROTOCOL_VERSIONS.includes(result.protocolVersion)) {
				throw new Error(`Server's protocol version is not supported: ${result.protocolVersion}`)
			}
			;(this as unknown as ClientInternals)._serverCapabilities = result.capabilities
			;(this as unknown as ClientInternals)._serverVersion = result.serverInfo
			if (transport.setProtocolVersion) {
				transport.setProtocolVersion(result.protocolVersion)
			}
			;(this as unknown as ClientInternals)._instructions = result.instructions
			await this.notification({
				method: "notifications/initialized",
			})
			if (self._pendingListChangedConfig) {
				self._setupListChangedHandlers(self._pendingListChangedConfig)
				self._pendingListChangedConfig = undefined
			}
		} catch (error) {
			void this.close()
			throw error
		}
	}
}
