import type { BalanceResponse, PaymentTransaction, UsageTransaction } from "@shared/ClineAccount"
import axios, { AxiosRequestConfig, AxiosResponse } from "axios"
import { ClineEnv } from "@/config"
import { ICAI_API_ENDPOINT } from "@/shared/cline/api"
import { normalizeCreditsAmount } from "@/shared/credits-display"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { AuthService } from "../auth/AuthService"
import { buildBasicClineHeaders } from "../EnvUtils"

export type VectorTokenUsageReportResult =
	| { ok: true; creditsCharged: number; remainingCredits: number; idempotent: boolean }
	| { ok: false; error: string; status?: number }

interface ICAIUserInfoResponse {
	code: number
	data: {
		user: {
			id: string
			name: string
			email: string
			image: string | null
			createdAt: string
		}
		credits: {
			remainingCredits: number
		}
	}
}

/** Normalize credits object from IC-AI (camelCase or snake_case; NUMERIC may arrive as string). */
function normalizeRemainingCreditsFromPayload(creditsRaw: unknown): number {
	if (creditsRaw == null || typeof creditsRaw !== "object") {
		return 0
	}
	const c = creditsRaw as Record<string, unknown>
	const raw = c.remainingCredits ?? c.remaining_credits
	if (raw == null) {
		return 0
	}
	const n = typeof raw === "number" ? raw : Number(raw)
	return Number.isFinite(n) ? normalizeCreditsAmount(n) : 0
}

/**
 * IC-AI `/api/extension/user-info` normally returns `{ code, data: { user, credits } }`.
 * Some deployments or proxies may return a flat `{ user, credits }` body. Accept both.
 */
function parseExtensionUserInfoPayload(raw: unknown): ICAIUserInfoResponse["data"] | undefined {
	if (raw == null || typeof raw !== "object") {
		return undefined
	}
	const root = raw as Record<string, unknown>

	if (root.error != null) {
		Logger.warn("IC-AI user-info payload contains error:", root.error)
		return undefined
	}

	if (typeof root.code === "number" && root.code !== 0) {
		Logger.warn(`IC-AI user-info non-success code: ${root.code}`)
		return undefined
	}

	let payload: Record<string, unknown> | undefined

	if ("data" in root && root.data != null && typeof root.data === "object") {
		payload = root.data as Record<string, unknown>
		// Rare: double-wrapped `{ code, data: { data: { user, credits } } }`
		if (!("user" in payload) && "data" in payload && payload.data != null && typeof payload.data === "object") {
			payload = payload.data as Record<string, unknown>
		}
	} else if ("user" in root && typeof root.user === "object" && root.user != null) {
		payload = root
	}

	if (!payload || typeof payload.user !== "object" || payload.user == null) {
		return undefined
	}

	const remainingCredits = normalizeRemainingCreditsFromPayload(payload.credits)

	return {
		user: payload.user as ICAIUserInfoResponse["data"]["user"],
		credits: { remainingCredits },
	}
}

export class ClineAccountService {
	private static instance: ClineAccountService
	private _authService: AuthService

	constructor() {
		this._authService = AuthService.getInstance()
	}

	public static getInstance(): ClineAccountService {
		if (!ClineAccountService.instance) {
			ClineAccountService.instance = new ClineAccountService()
		}
		return ClineAccountService.instance
	}

	get baseUrl(): string {
		return ClineEnv.config().apiBaseUrl
	}

	/**
	 * Makes an authenticated GET request to IC-AI's extension API.
	 */
	private async buildAuthedAxiosConfig(config: AxiosRequestConfig = {}): Promise<AxiosRequestConfig> {
		const token = await this._authService.getAuthToken()
		if (!token) {
			throw new Error("No IC-AI auth token found")
		}
		return {
			...config,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				...(await buildBasicClineHeaders()),
				...config.headers,
			},
			...getAxiosSettings(),
		}
	}

	private async authenticatedRequest<T>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T> {
		const url = new URL(endpoint, this.baseUrl).toString()
		const requestConfig = await this.buildAuthedAxiosConfig(config)
		const response: AxiosResponse = await axios.request({
			url,
			method: "GET",
			...requestConfig,
		})
		if (response.status < 200 || response.status >= 300) {
			throw new Error(`Request to ${endpoint} failed with status ${response.status}`)
		}
		return response.data as T
	}

	private async authenticatedPostJson<T>(endpoint: string, body: unknown): Promise<AxiosResponse<T>> {
		const url = new URL(endpoint, this.baseUrl).toString()
		const requestConfig = await this.buildAuthedAxiosConfig()
		return axios.request<T>({
			url,
			method: "POST",
			data: body,
			validateStatus: () => true,
			...requestConfig,
		})
	}

	/**
	 * Reports token usage for Vector `cline` models; server computes credits (idempotent per settlementId).
	 */
	async reportVectorTokenUsage(payload: {
		settlementId: string
		modelId: string
		inputTokens: number
		outputTokens: number
		taskUlid?: string
	}): Promise<VectorTokenUsageReportResult> {
		try {
			const response = await this.authenticatedPostJson<unknown>(ICAI_API_ENDPOINT.VECTOR_TOKEN_USAGE, payload)
			if (response.status === 402) {
				const err = (response.data as Record<string, unknown>)?.error
				return { ok: false, error: String(err ?? "insufficient_credits"), status: 402 }
			}
			if (response.status < 200 || response.status >= 300) {
				const err = (response.data as Record<string, unknown>)?.error
				return {
					ok: false,
					error: String(err ?? `http_${response.status}`),
					status: response.status,
				}
			}
			const root = response.data as Record<string, unknown>
			if (root?.code !== 0) {
				const err = root.error ?? root.message
				Logger.warn("IC-AI vector-token-usage business error:", root)
				return { ok: false, error: String(err ?? "request_failed"), status: response.status }
			}
			if (root.data == null || typeof root.data !== "object") {
				Logger.warn("IC-AI vector-token-usage unexpected body:", root)
				return { ok: false, error: "invalid_response" }
			}
			const data = root.data as Record<string, unknown>
			const creditsCharged = Number(data.creditsCharged)
			const remainingCredits = normalizeRemainingCreditsFromPayload({
				remainingCredits: data.remainingCredits,
			})
			const idempotent = Boolean(data.idempotent)
			if (!Number.isFinite(creditsCharged) || !Number.isFinite(remainingCredits)) {
				return { ok: false, error: "invalid_response" }
			}
			return { ok: true, creditsCharged, remainingCredits, idempotent }
		} catch (error) {
			Logger.error("IC-AI vector-token-usage request failed:", error)
			return { ok: false, error: error instanceof Error ? error.message : "request_failed" }
		}
	}

	/**
	 * Fetches user info and credits from IC-AI in a single request.
	 */
	async fetchUserInfo(): Promise<ICAIUserInfoResponse["data"] | undefined> {
		try {
			const raw = await this.authenticatedRequest<unknown>(ICAI_API_ENDPOINT.USER_INFO)
			return parseExtensionUserInfoPayload(raw)
		} catch (error) {
			Logger.error("Failed to fetch IC-AI user info:", error)
			return undefined
		}
	}

	/**
	 * Fetches the user's credit balance from IC-AI.
	 * Returns a BalanceResponse compatible with the existing webview interface.
	 * Balance is remainingCredits in real credits (no scaling in the extension).
	 */
	async fetchBalanceRPC(): Promise<BalanceResponse | undefined> {
		try {
			const userInfo = await this.fetchUserInfo()
			if (!userInfo) {
				return undefined
			}
			return {
				balance: normalizeRemainingCreditsFromPayload(userInfo.credits),
				userId: userInfo.user.id,
			}
		} catch (error) {
			Logger.error("Failed to fetch balance (RPC):", error)
			return undefined
		}
	}

	/**
	 * IC-AI doesn't have per-usage transaction tracking matching Cline's format.
	 * Returns an empty array for interface compatibility.
	 */
	async fetchUsageTransactionsRPC(): Promise<UsageTransaction[] | undefined> {
		return []
	}

	/**
	 * IC-AI doesn't have payment transaction tracking matching Cline's format.
	 * Returns an empty array for interface compatibility.
	 */
	async fetchPaymentTransactionsRPC(): Promise<PaymentTransaction[] | undefined> {
		return []
	}

	async fetchMe(): Promise<any | undefined> {
		try {
			const data = await this.fetchUserInfo()
			return data?.user
		} catch (error) {
			Logger.error("Failed to fetch user data (RPC):", error)
			return undefined
		}
	}

	async fetchUserOrganizationsRPC(): Promise<any[] | undefined> {
		return []
	}

	async fetchOrganizationCreditsRPC(_organizationId: string): Promise<any | undefined> {
		return undefined
	}

	async fetchOrganizationUsageTransactionsRPC(_organizationId: string): Promise<any[] | undefined> {
		return []
	}

	async switchAccount(_organizationId?: string): Promise<void> {
		// No-op: IC-AI doesn't have organization switching
	}

	private getCurrentUser() {
		return this._authService.getInfo().user
	}
}
