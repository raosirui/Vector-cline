import * as vscode from "vscode"
// Although vscode.window.terminals provides a list of all open terminals, there's no way to know whether they're busy or not (exitStatus does not provide useful information for most commands). In order to prevent creating too many terminals, we need to keep track of terminals through the life of the extension, as well as session specific terminals for the life of a task (to get latest unretrieved output).
// Since we have promises keeping track of terminal processes, we get the added benefit of keep track of busy terminals even after a task is closed.
export class TerminalRegistry {
	static terminals = []
	static nextTerminalId = 1
	static createTerminal(cwd, shellPath) {
		const terminalOptions = {
			cwd,
			name: "Cline",
			iconPath: new vscode.ThemeIcon("cline-icon"),
			env: {
				CLINE_ACTIVE: "true",
			},
		}
		// If a specific shell path is provided, use it
		if (shellPath) {
			terminalOptions.shellPath = shellPath
		}
		const terminal = vscode.window.createTerminal(terminalOptions)
		TerminalRegistry.nextTerminalId++
		const newInfo = {
			terminal,
			busy: false,
			lastCommand: "",
			id: TerminalRegistry.nextTerminalId,
			shellPath,
			lastActive: Date.now(),
		}
		TerminalRegistry.terminals.push(newInfo)
		return newInfo
	}
	static getTerminal(id) {
		const terminalInfo = TerminalRegistry.terminals.find((t) => t.id === id)
		if (terminalInfo && TerminalRegistry.isTerminalClosed(terminalInfo.terminal)) {
			TerminalRegistry.removeTerminal(id)
			return undefined
		}
		return terminalInfo
	}
	static updateTerminal(id, updates) {
		const terminal = TerminalRegistry.getTerminal(id)
		if (terminal) {
			Object.assign(terminal, updates)
		}
	}
	static removeTerminal(id) {
		TerminalRegistry.terminals = TerminalRegistry.terminals.filter((t) => t.id !== id)
	}
	static getAllTerminals() {
		TerminalRegistry.terminals = TerminalRegistry.terminals.filter((t) => !TerminalRegistry.isTerminalClosed(t.terminal))
		return TerminalRegistry.terminals
	}
	// The exit status of the terminal will be undefined while the terminal is active. (This value is set when onDidCloseTerminal is fired.)
	static isTerminalClosed(terminal) {
		return terminal.exitStatus !== undefined
	}
}
//# sourceMappingURL=VscodeTerminalRegistry.js.map
