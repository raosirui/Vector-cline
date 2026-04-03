import prettyBytes from "pretty-bytes"

export function formatLargeNumber(num: number): string {
	if (num >= 1e9) {
		return (num / 1e9).toFixed(1) + "b"
	}
	if (num >= 1e6) {
		return (num / 1e6).toFixed(1) + "m"
	}
	if (num >= 1e3) {
		return (num / 1e3).toFixed(1) + "k"
	}
	return num.toString()
}

// Helper to format cents as dollars with 2 decimal places
export function formatDollars(cents?: number): string {
	if (cents === undefined) {
		return ""
	}

	return (cents / 100).toFixed(2)
}

/**
 * Returns credits for display purposes.
 *
 * IC-AI returns credits as plain integers, so no conversion is needed.
 *
 * @param credits - The credit balance from the backend
 * @returns The balance for display (typically displayed with 4 decimal places)
 *
 * @example
 * formatCreditsBalance(999)  // returns 999
 * formatCreditsBalance(50)   // returns 50
 */
export function formatCreditsBalance(credits: number): number {
	return credits
}

export function formatTimestamp(timestamp: string): string {
	const date = new Date(timestamp)

	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		month: "2-digit",
		day: "2-digit",
		year: "2-digit",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	})

	return dateFormatter.format(date)
}

export function formatSize(bytes?: number) {
	if (bytes === undefined) {
		return "--kb"
	}

	return prettyBytes(bytes)
}
export function formatSeconds(seconds?: number): string {
	if (seconds === undefined) {
		return "--:--"
	}

	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
		.toString()
		.padStart(2, "0")

	return `${mins}:${secs}`
}
