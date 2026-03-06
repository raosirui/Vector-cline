import * as os from "os"
import * as path from "path"
import * as vscode from "vscode"
import { Logger } from "@/shared/services/Logger"
/**
 * Handles Jupyter notebook diff views with cell-level rendering.
 *
 * Creates a temporary file with modified content and opens VS Code's native
 * notebook diff view, which provides meaningful cell-level comparisons instead
 * of raw JSON diffs.
 */
export class NotebookDiffView {
	tempModifiedUri
	tempFileWatcher
	/**
	 * Opens a notebook diff view for the given file.
	 *
	 * @param absolutePath Path to the notebook file
	 * @param editor The active text editor containing modified content
	 */
	async open(absolutePath, editor) {
		const uri = vscode.Uri.file(absolutePath)
		const fileName = path.basename(uri.fsPath)
		// Check if Jupyter extension is available
		const jupyterExtension = vscode.extensions.getExtension("ms-toolsai.jupyter")
		if (!jupyterExtension) {
			vscode.window.showErrorMessage("Jupyter extension is required for notebook diffs.")
			return
		}
		if (!jupyterExtension.isActive) {
			await jupyterExtension.activate()
		}
		await this.createDiffView(uri, fileName, editor)
	}
	async createDiffView(uri, fileName, editor) {
		const tempDir = os.tmpdir()
		const timestamp = Date.now()
		const tempModifiedPath = path.join(tempDir, `cline-modified-${timestamp}-${fileName}`)
		const currentContent = editor.document.getText()
		// Validate JSON before creating notebook diff
		try {
			JSON.parse(currentContent)
		} catch {
			Logger.error(`Invalid JSON content for notebook file ${fileName}, skipping notebook diff view`)
			return
		}
		await vscode.workspace.fs.writeFile(vscode.Uri.file(tempModifiedPath), new TextEncoder().encode(currentContent))
		this.tempModifiedUri = vscode.Uri.file(tempModifiedPath)
		this.setupFileWatcher(editor)
		await vscode.commands.executeCommand(
			"vscode.diff",
			uri,
			this.tempModifiedUri,
			`${fileName}: Original ↔ Cline's Changes (Notebook)`,
		)
		// Brief delay to allow VS Code to render the notebook diff view
		await new Promise((resolve) => setTimeout(resolve, 500))
	}
	setupFileWatcher(editor) {
		if (!this.tempModifiedUri) {
			return
		}
		const tempDir = path.dirname(this.tempModifiedUri.fsPath)
		const tempFileName = path.basename(this.tempModifiedUri.fsPath)
		this.tempFileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(tempDir, tempFileName))
		this.tempFileWatcher.onDidChange(async () => {
			await this.syncToEditor(editor)
		})
	}
	async syncToEditor(editor) {
		if (!this.tempModifiedUri || !editor.document) {
			return
		}
		try {
			const tempContent = await vscode.workspace.fs.readFile(this.tempModifiedUri)
			const tempContentString = new TextDecoder().decode(tempContent)
			const edit = new vscode.WorkspaceEdit()
			const fullRange = new vscode.Range(0, 0, editor.document.lineCount, 0)
			edit.replace(editor.document.uri, fullRange, tempContentString)
			await vscode.workspace.applyEdit(edit)
		} catch (error) {
			Logger.error("Failed to sync temp file to editor:", error)
		}
	}
	async cleanup() {
		if (this.tempFileWatcher) {
			this.tempFileWatcher.dispose()
			this.tempFileWatcher = undefined
		}
		if (this.tempModifiedUri) {
			try {
				await vscode.workspace.fs.delete(this.tempModifiedUri)
			} catch (error) {
				Logger.error(`Failed to cleanup temporary file: ${error}`)
			}
			this.tempModifiedUri = undefined
		}
	}
}
//# sourceMappingURL=NotebookDiffView.js.map
