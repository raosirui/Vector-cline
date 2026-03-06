import * as vscode from "vscode"
import { ExtensionRegistryInfo } from "@/registry"
import { ClineClient } from "@/shared/cline"
export async function getHostVersion(_) {
	return {
		platform: vscode.env.appName,
		version: vscode.version,
		clineType: ClineClient.VSCode,
		clineVersion: ExtensionRegistryInfo.version,
	}
}
//# sourceMappingURL=getHostVersion.js.map
