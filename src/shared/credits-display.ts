/**
 * Credits displayed and normalized entirely on the Vector extension side.
 * Extension API returns IC-AI `remainingCredits` as JSON numbers; we normalize to 8 decimals then show two (typical NUMERIC scale pattern).
 */

/** Typical PostgreSQL NUMERIC scale for stored credits (matches common Drizzle schema). */
export const CREDITS_NUMERIC_DECIMAL_PLACES = 8

/**
 * Normalizes a finite amount to the same precision as stored credits (avoids float drift vs DB/API).
 */
export function normalizeCreditsAmount(amount: number): number {
	if (!Number.isFinite(amount)) {
		return 0
	}
	const factor = 10 ** CREDITS_NUMERIC_DECIMAL_PLACES
	return Math.round(amount * factor) / factor
}

/** Two decimal places for UI (consistent with standard credits formatting). */
export function formatCreditsDisplay(amount: number): string {
	if (!Number.isFinite(amount)) {
		return (0).toFixed(2)
	}
	return normalizeCreditsAmount(amount).toFixed(2)
}
