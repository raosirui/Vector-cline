/**
 * Copies @vscode/codicons dist files (codicon.css + codicon.ttf) into assets/codicons/
 * so they are always included in the vsix and load correctly in the webview.
 * See: https://github.com/microsoft/vscode-extension-samples/issues/692
 */
import fs from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const srcDir = path.join(root, "node_modules", "@vscode", "codicons", "dist")
const destDir = path.join(root, "assets", "codicons")
const files = ["codicon.css", "codicon.ttf"]

async function main() {
	await fs.mkdir(destDir, { recursive: true })
	for (const name of files) {
		const src = path.join(srcDir, name)
		const dest = path.join(destDir, name)
		await fs.copyFile(src, dest)
		console.log(`[copy-codicons] ${name} -> assets/codicons/`)
	}
}

main().catch((err) => {
	console.error("[copy-codicons] Failed:", err)
	process.exit(1)
})
