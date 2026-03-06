import { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import * as path from "path"
import * as vscode from "vscode"
import { DecorationController } from "@/hosts/vscode/DecorationController"
import { NotebookDiffView } from "@/hosts/vscode/NotebookDiffView"
import { Logger } from "@/shared/services/Logger"
import { arePathsEqual } from "@/utils/path"
export const DIFF_VIEW_URI_SCHEME = "cline-diff"
export class VscodeDiffViewProvider extends DiffViewProvider {
	activeDiffEditor
	fadedOverlayController
	activeLineController
	notebookDiffView
	async openDiffEditor() {
		if (!this.absolutePath) {
			throw new Error("No file path set")
		}
		// if the file was already open, close it (must happen after showing the diff view since if it's the only tab the column will close)
		this.documentWasOpen = false
		// close the tab if it's open (it's already been saved)
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter((tab) => tab.input instanceof vscode.TabInputText && arePathsEqual(tab.input.uri.fsPath, this.absolutePath))
		for (const tab of tabs) {
			if (!tab.isDirty) {
				try {
					await vscode.window.tabGroups.close(tab)
				} catch (error) {
					Logger.warn("Tab close retry failed:", error.message)
				}
			}
			this.documentWasOpen = true
		}
		const uri = vscode.Uri.file(this.absolutePath)
		// If this diff editor is already open (ie if a previous write file was interrupted) then we should activate that instead of opening a new diff
		const diffTab = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.find(
				(tab) =>
					tab.input instanceof vscode.TabInputTextDiff &&
					tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME &&
					arePathsEqual(tab.input.modified.fsPath, uri.fsPath),
			)
		if (diffTab && diffTab.input instanceof vscode.TabInputTextDiff) {
			// Use already open diff editor.
			this.activeDiffEditor = await vscode.window.showTextDocument(diffTab.input.modified, {
				preserveFocus: true,
			})
		} else {
			// Open new diff editor.
			this.activeDiffEditor = await new Promise((resolve, reject) => {
				const fileName = path.basename(uri.fsPath)
				const fileExists = this.editType === "modify"
				const disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
					if (editor && arePathsEqual(editor.document.uri.fsPath, uri.fsPath)) {
						disposable.dispose()
						resolve(editor)
					}
				})
				vscode.commands.executeCommand(
					"vscode.diff",
					vscode.Uri.parse(
						`${DIFF_VIEW_URI_SCHEME}:${fileName.replace(/%/g, "%25").replace(/#/g, "%23").replace(/\?/g, "%3F")}`,
					).with({
						query: Buffer.from(this.originalContent ?? "").toString("base64"),
					}),
					uri,
					`${fileName}: ${fileExists ? "Original ↔ Cline's Changes" : "New File"} (Editable)`,
					{
						preserveFocus: true,
					},
				)
				// This may happen on very slow machines ie project idx
				setTimeout(() => {
					disposable.dispose()
					reject(new Error("Failed to open diff editor, please try again..."))
				}, 10_000)
			})
		}
		this.fadedOverlayController = new DecorationController("fadedOverlay", this.activeDiffEditor)
		this.activeLineController = new DecorationController("activeLine", this.activeDiffEditor)
		// Apply faded overlay to all lines initially
		this.fadedOverlayController.addLines(0, this.activeDiffEditor.document.lineCount)
	}
	async replaceText(content, rangeToReplace, currentLine) {
		if (!this.activeDiffEditor || !this.activeDiffEditor.document) {
			throw new Error("User closed text editor, unable to edit file...")
		}
		// Place cursor at the beginning of the diff editor to keep it out of the way of the stream animation
		const beginningOfDocument = new vscode.Position(0, 0)
		this.activeDiffEditor.selection = new vscode.Selection(beginningOfDocument, beginningOfDocument)
		// Replace the text in the diff editor document.
		const document = this.activeDiffEditor?.document
		const replacingToEnd = rangeToReplace.endLine >= document.lineCount
		const edit = new vscode.WorkspaceEdit()
		const range = new vscode.Range(rangeToReplace.startLine, 0, rangeToReplace.endLine, 0)
		edit.replace(document.uri, range, content)
		await vscode.workspace.applyEdit(edit)
		// VS Code can normalize trailing newlines on full-document replacements.
		// Only fix up when replacing to the end to avoid touching untouched content.
		if (replacingToEnd) {
			const desiredTrailingNewlines = countTrailingNewlines(content)
			const actualTrailingNewlines = countTrailingNewlines(document.getText())
			const newlineDelta = desiredTrailingNewlines - actualTrailingNewlines
			if (newlineDelta > 0) {
				const fixEdit = new vscode.WorkspaceEdit()
				fixEdit.insert(document.uri, document.lineAt(document.lineCount - 1).range.end, "\n".repeat(newlineDelta))
				await vscode.workspace.applyEdit(fixEdit)
			} else if (newlineDelta < 0) {
				const fixEdit = new vscode.WorkspaceEdit()
				const startLine = Math.max(0, document.lineCount + newlineDelta)
				fixEdit.delete(document.uri, new vscode.Range(startLine, 0, document.lineCount, 0))
				await vscode.workspace.applyEdit(fixEdit)
			}
		}
		if (currentLine !== undefined) {
			// Update decorations for the entire changed section
			this.activeLineController?.setActiveLine(currentLine)
			this.fadedOverlayController?.updateOverlayAfterLine(currentLine, document.lineCount)
		}
	}
	async scrollEditorToLine(line) {
		if (!this.activeDiffEditor) {
			return
		}
		const scrollLine = line + 4
		this.activeDiffEditor.revealRange(new vscode.Range(scrollLine, 0, scrollLine, 0), vscode.TextEditorRevealType.InCenter)
	}
	async scrollAnimation(startLine, endLine) {
		if (!this.activeDiffEditor) {
			return
		}
		const totalLines = endLine - startLine
		const numSteps = 10 // Adjust this number to control animation speed
		const stepSize = Math.max(1, Math.floor(totalLines / numSteps))
		// Create and await the smooth scrolling animation
		for (let line = startLine; line <= endLine; line += stepSize) {
			this.activeDiffEditor.revealRange(new vscode.Range(line, 0, line, 0), vscode.TextEditorRevealType.InCenter)
			await new Promise((resolve) => setTimeout(resolve, 16)) // ~60fps
		}
	}
	async truncateDocument(lineNumber) {
		if (!this.activeDiffEditor) {
			return
		}
		const document = this.activeDiffEditor.document
		if (lineNumber < document.lineCount) {
			const edit = new vscode.WorkspaceEdit()
			edit.delete(document.uri, new vscode.Range(lineNumber, 0, document.lineCount, 0))
			await vscode.workspace.applyEdit(edit)
		}
	}
	async onFinalUpdate() {
		// Clear all decorations at the end of streaming
		this.fadedOverlayController?.clear()
		this.activeLineController?.clear()
	}
	async getDocumentLineCount() {
		return this.activeDiffEditor?.document.lineCount ?? 0
	}
	async getDocumentText() {
		if (!this.activeDiffEditor || !this.activeDiffEditor.document) {
			return undefined
		}
		return this.activeDiffEditor.document.getText()
	}
	async saveDocument() {
		if (!this.activeDiffEditor) {
			return false
		}
		if (!this.activeDiffEditor.document.isDirty) {
			return false
		}
		await this.activeDiffEditor.document.save()
		return true
	}
	async closeAllDiffViews() {
		// Close all the cline diff views.
		const tabs = vscode.window.tabGroups.all
			.flatMap((tg) => tg.tabs)
			.filter((tab) => tab.input instanceof vscode.TabInputTextDiff && tab.input?.original?.scheme === DIFF_VIEW_URI_SCHEME)
		for (const tab of tabs) {
			// trying to close dirty views results in save popup
			if (!tab.isDirty) {
				try {
					await vscode.window.tabGroups.close(tab)
				} catch (error) {
					Logger.warn("Tab close retry failed:", error.message)
				}
			}
		}
	}
	async resetDiffView() {
		if (this.notebookDiffView) {
			await this.notebookDiffView.cleanup()
			this.notebookDiffView = undefined
		}
		this.activeDiffEditor = undefined
		this.fadedOverlayController = undefined
		this.activeLineController = undefined
	}
	async switchToSpecializedEditor() {
		if (!this.isNotebookFile() || !this.activeDiffEditor || !this.absolutePath) {
			return
		}
		try {
			this.notebookDiffView = new NotebookDiffView()
			await this.notebookDiffView.open(this.absolutePath, this.activeDiffEditor)
		} catch (error) {
			Logger.error("Failed to create notebook diff view:", error)
		}
	}
	async showFile(absolutePath) {
		const uri = vscode.Uri.file(absolutePath)
		if (this.isNotebookFile()) {
			// Open with Jupyter notebook editor if available
			const jupyterExtension = vscode.extensions.getExtension("ms-toolsai.jupyter")
			if (jupyterExtension) {
				await vscode.commands.executeCommand("vscode.openWith", uri, "jupyter-notebook")
				return
			}
		}
		// Default: open as text
		await vscode.window.showTextDocument(uri, { preview: false })
	}
}
function countTrailingNewlines(text) {
	let count = 0
	for (let i = text.length - 1; i >= 0 && text[i] === "\n"; i -= 1) {
		count += 1
	}
	return count
}
//# sourceMappingURL=VscodeDiffViewProvider.js.map
