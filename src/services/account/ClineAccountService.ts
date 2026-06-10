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

export type VectorTokenSettlementSuccess = {
	ok: true
	creditsCharged: number
	remainingCredits: number
	idempotent: boolean
}

export type VectorTokenSettlementFailure = {
	ok: false
	error: "insufficient_credits" | "no_token" | "bad_response" | "network" | string
	httpStatus?: number
}

export type VectorTokenSettlementResult = VectorTokenSettlementSuccess | VectorTokenSettlementFailure

interface ICAIVectorUsageHistoryItem {
	id: string
	settlementId: string
	modelId: string
	inputTokens: number
	outputTokens: number
	creditsCharged: number
	createdAt: string
}

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

/**
 * User-facing text for IC-AI `vector-token-usage` error codes (opaque codes still logged separately).
 */
export function describeIcAiVectorTokenUsageFailure(errorCode: string): string {
	switch (errorCode) {
		case "db_missing_table":
			return "IC-AI is missing Vector billing tables. Ask the administrator to apply database migrations (e.g. drizzle migration 0002 / pnpm db:migrate)."
		case "fk_violation":
			return "Your session does not match the IC-AI database. Sign out of the Vector extension and sign in again."
		case "deadlock":
			return "Temporary database conflict; please retry."
		case "user_not_found":
			return "IC-AI could not find your user for this token. Sign out and sign in again."
		case "internal_error":
			return "IC-AI failed to record usage (internal_error). If this persists, contact support with the request time."
		case "unknown_model":
			return "This model is not configured for IC-AI billing yet. Update the Vector extension and IC-AI server, or switch to a supported model (kimi-k2.5, glm-4.7, glm-5, gpt-5.4, gpt-5.5)."
		default:
			return ""
	}
}

function mapIcaiSettlementToUsageTransaction(row: ICAIVectorUsageHistoryItem, userId: string): UsageTransaction {
	const createdAt = typeof row.createdAt === "string" ? row.createdAt : new Date(row.createdAt as unknown as Date).toISOString()
	const pt = row.inputTokens ?? 0
	const ct = row.outputTokens ?? 0
	return {
		aiInferenceProviderName: "IC-AI Vector",
		aiModelName: row.modelId,
		aiModelTypeName: "chat",
		completionTokens: ct,
		costUsd: 0,
		createdAt,
		creditsUsed: row.creditsCharged,
		generationId: row.settlementId,
		id: row.id,
		metadata: {
			additionalProp1: "",
			additionalProp2: "",
			additionalProp3: "",
		},
		operation: "vector_token_usage",
		organizationId: "",
		promptTokens: pt,
		totalTokens: pt + ct,
		userId,
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

	private async authenticatedGetAllowAnyStatus<T>(
		endpoint: string,
		config: AxiosRequestConfig = {},
	): Promise<{ status: number; data: T }> {
		const url = new URL(endpoint, this.baseUrl).toString()
		const requestConfig = await this.buildAuthedAxiosConfig(config)
		const response: AxiosResponse<T> = await axios.request({
			url,
			method: "GET",
			...requestConfig,
			validateStatus: () => true,
		})
		return { status: response.status, data: response.data as T }
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
	 * Same settlement as {@link reportVectorTokenUsage} with stable error codes for task/subagent callers (`no_token`, `insufficient_credits`, etc.).
	 */
	async submitVectorTokenUsageSettlement(params: {
		settlementId: string
		modelId: string
		inputTokens: number
		outputTokens: number
		taskUlid?: string
	}): Promise<VectorTokenSettlementResult> {
		const token = await this._authService.getAuthToken()
		if (!token) {
			return { ok: false, error: "no_token" }
		}
		const r = await this.reportVectorTokenUsage(params)
		if (r.ok) {
			return r
		}
		if (r.status === 402 || r.error === "insufficient_credits") {
			return { ok: false, error: "insufficient_credits", httpStatus: r.status ?? 402 }
		}
		return { ok: false, error: r.error, httpStatus: r.status }
	}

	async fetchVectorUsageHistoryPage(params: {
		page?: number
		limit?: number
	}): Promise<{ items: ICAIVectorUsageHistoryItem[]; total: number } | undefined> {
		try {
			const page = params.page ?? 1
			const limit = Math.min(params.limit ?? 30, 100)
			const qs = new URLSearchParams({
				page: String(page),
				limit: String(limit),
			})
			const path = `${ICAI_API_ENDPOINT.VECTOR_USAGE_HISTORY}?${qs.toString()}`
			const { status, data } = await this.authenticatedGetAllowAnyStatus<{
				code?: number
				data?: { items?: ICAIVectorUsageHistoryItem[]; total?: number }
			}>(path)

			if (status < 200 || status >= 300) {
				return undefined
			}
			const root = data as Record<string, unknown>
			if (typeof root?.code === "number" && root.code !== 0) {
				return undefined
			}
			const inner = root?.data as { items?: ICAIVectorUsageHistoryItem[]; total?: number } | undefined
			return {
				items: inner?.items ?? [],
				total: typeof inner?.total === "number" ? inner.total : 0,
			}
		} catch (e) {
			Logger.error("IC-AI vector-usage-history request failed:", e)
			return undefined
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
	 * Vector VS Code settlements recorded on IC-AI (`extension_vector_usage_settlement`).
	 */
	async fetchUsageTransactionsRPC(): Promise<UsageTransaction[] | undefined> {
		try {
			const page = await this.fetchVectorUsageHistoryPage({ page: 1, limit: 100 })
			if (!page?.items.length) {
				return []
			}
			const userInfo = await this.fetchUserInfo()
			const userId = userInfo?.user?.id ?? ""
			return page.items.map((row) => mapIcaiSettlementToUsageTransaction(row, userId))
		} catch (error) {
			Logger.error("Failed to fetch IC-AI usage history:", error)
			return []
		}
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
