import { builtInRemoteMcpPresets, RemoteMcpTransportType } from "@shared/mcp-presets"
import { EmptyRequest } from "@shared/proto/cline/common"
import { AddRemoteMcpServerRequest, McpServers } from "@shared/proto/cline/mcp"
import { convertProtoMcpServersToMcpServers } from "@shared/proto-conversions/mcp/mcp-server-conversion"
import {
	VSCodeButton,
	VSCodeDropdown,
	VSCodeLink,
	VSCodeOption,
	VSCodeRadio,
	VSCodeRadioGroup,
	VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react"
import { useState } from "react"
import { LINKS } from "@/constants"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { McpServiceClient } from "@/services/grpc-client"

type TransportType = RemoteMcpTransportType
const MANUAL_PRESET_ID = "manual"
const defaultPreset = builtInRemoteMcpPresets[0]

const AddRemoteServerForm = ({ onServerAdded }: { onServerAdded: () => void }) => {
	const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset?.id ?? MANUAL_PRESET_ID)
	const [serverName, setServerName] = useState(defaultPreset?.serverName ?? "")
	const [serverUrl, setServerUrl] = useState(defaultPreset?.serverUrl ?? "")
	const [transportType, setTransportType] = useState<TransportType>(defaultPreset?.transportType ?? "streamableHttp")
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState("")
	const { setMcpServers } = useExtensionState()

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault()

		if (!serverName.trim()) {
			setError("Server name is required")
			return
		}

		if (!serverUrl.trim()) {
			setError("Server URL is required")
			return
		}

		try {
			new URL(serverUrl)
		} catch (_err) {
			setError("Invalid URL format")
			return
		}

		setError("")
		setIsSubmitting(true)

		try {
			const servers: McpServers = await McpServiceClient.addRemoteMcpServer(
				AddRemoteMcpServerRequest.create({
					serverName: serverName.trim(),
					serverUrl: serverUrl.trim(),
					transportType: transportType,
				}),
			)

			setIsSubmitting(false)

			const mcpServers = convertProtoMcpServersToMcpServers(servers.mcpServers)
			setMcpServers(mcpServers)

			setServerName("")
			setServerUrl("")
			onServerAdded()
		} catch (error) {
			setIsSubmitting(false)
			setError(error instanceof Error ? error.message : "Failed to add server")
		}
	}

	const applyPreset = (presetId: string) => {
		setSelectedPresetId(presetId)
		setError("")

		if (presetId === MANUAL_PRESET_ID) {
			setServerName("")
			setServerUrl("")
			setTransportType("streamableHttp")
			return
		}

		const preset = builtInRemoteMcpPresets.find((item) => item.id === presetId)
		if (!preset) {
			return
		}

		setServerName(preset.serverName)
		setServerUrl(preset.serverUrl)
		setTransportType(preset.transportType)
	}

	const selectedPreset =
		selectedPresetId === MANUAL_PRESET_ID
			? undefined
			: builtInRemoteMcpPresets.find((preset) => preset.id === selectedPresetId)

	return (
		<div className="p-4 px-5">
			<div className="text-(--vscode-foreground) mb-2">
				Choose a built-in preset or add a remote MCP server manually by providing a name and URL endpoint. Learn more{" "}
				<VSCodeLink href={LINKS.DOCUMENTATION.REMOTE_MCP_SERVER_DOCS} style={{ display: "inline" }}>
					here.
				</VSCodeLink>
			</div>

			<form onSubmit={handleSubmit}>
				{builtInRemoteMcpPresets.length > 0 && (
					<>
						<div className="mb-2">
							<label className={`block text-sm font-medium mb-2 ${isSubmitting ? "opacity-50" : ""}`}>Preset</label>
							<VSCodeDropdown
								disabled={isSubmitting}
								onChange={(e) => applyPreset((e.target as HTMLSelectElement).value)}
								style={{ width: "100%" }}
								value={selectedPresetId}>
								<VSCodeOption value={MANUAL_PRESET_ID}>Manual configuration</VSCodeOption>
								{builtInRemoteMcpPresets.map((preset) => (
									<VSCodeOption key={preset.id} value={preset.id}>
										{preset.displayName}
									</VSCodeOption>
								))}
							</VSCodeDropdown>
						</div>

						{selectedPreset && (
							<div
								className="mb-3"
								style={{
									padding: "10px 12px",
									borderRadius: 4,
									background: "var(--vscode-textBlockQuote-background)",
									borderLeft: "3px solid var(--vscode-textLink-foreground)",
								}}>
								<div style={{ fontSize: 13, marginBottom: 4 }}>{selectedPreset.description}</div>
								<div
									style={{
										fontSize: 12,
										color: "var(--vscode-descriptionForeground)",
										wordBreak: "break-all",
									}}>
									{selectedPreset.serverUrl}
								</div>
							</div>
						)}
					</>
				)}

				<div className="mb-2">
					<VSCodeTextField
						className="w-full"
						disabled={isSubmitting}
						onChange={(e) => {
							setServerName((e.target as HTMLInputElement).value)
							setError("")
						}}
						placeholder="mcp-server"
						value={serverName}>
						Server Name
					</VSCodeTextField>
				</div>

				<div className="mb-2">
					<VSCodeTextField
						className="w-full mr-4"
						disabled={isSubmitting}
						onChange={(e) => {
							setServerUrl((e.target as HTMLInputElement).value)
							setError("")
						}}
						placeholder="https://example.com/mcp-server"
						value={serverUrl}>
						Server URL
					</VSCodeTextField>
				</div>

				<div className="mb-3">
					<label className={`block text-sm font-medium mb-2 ${isSubmitting ? "opacity-50" : ""}`}>Transport Type</label>
					<VSCodeRadioGroup
						disabled={isSubmitting}
						onChange={(e) => {
							const value = (e.target as HTMLInputElement).value as TransportType
							setTransportType(value)
						}}
						value={transportType}>
						<VSCodeRadio checked={transportType === "streamableHttp"} value="streamableHttp">
							Streamable HTTP
						</VSCodeRadio>
						<VSCodeRadio checked={transportType === "sse"} value="sse">
							SSE (Legacy)
						</VSCodeRadio>
					</VSCodeRadioGroup>
				</div>

				{error && <div className="mb-3 text-(--vscode-errorForeground)">{error}</div>}

				<VSCodeButton className="w-full" disabled={isSubmitting} type="submit">
					{isSubmitting ? "Connecting..." : "Add Server"}
				</VSCodeButton>

				<VSCodeButton
					appearance="secondary"
					onClick={() => {
						McpServiceClient.openMcpSettings(EmptyRequest.create({})).catch((error) => {
							console.error("Error opening MCP settings:", error)
						})
					}}
					style={{ width: "100%", marginBottom: "5px", marginTop: 15 }}>
					Edit Configuration
				</VSCodeButton>
			</form>
		</div>
	)
}

export default AddRemoteServerForm
