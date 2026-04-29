import type { BalanceResponse, PaymentTransaction, UsageTransaction } from "@shared/ClineAccount"
import axios, { AxiosRequestConfig, AxiosResponse } from "axios"
import { ClineEnv } from "@/config"
import { ICAI_API_ENDPOINT } from "@/shared/cline/api"
import { getAxiosSettings } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { AuthService } from "../auth/AuthService"
import { buildBasicClineHeaders } from "../EnvUtils"

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
	private async authenticatedRequest<T>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T> {
		const url = new URL(endpoint, this.baseUrl).toString()
		const token = await this._authService.getAuthToken()
		if (!token) {
			throw new Error("No IC-AI auth token found")
		}
		const requestConfig: AxiosRequestConfig = {
			...config,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				...(await buildBasicClineHeaders()),
				...config.headers,
			},
			...getAxiosSettings(),
		}
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

	/**
	 * Fetches user info and credits from IC-AI in a single request.
	 */
	async fetchUserInfo(): Promise<ICAIUserInfoResponse["data"] | undefined> {
		try {
			const response = await this.authenticatedRequest<ICAIUserInfoResponse>(ICAI_API_ENDPOINT.USER_INFO)
			return response.data
		} catch (error) {
			Logger.error("Failed to fetch IC-AI user info:", error)
			return undefined
		}
	}

	/**
	 * Fetches the user's credit balance from IC-AI.
	 * Returns a BalanceResponse compatible with the existing webview interface.
	 * Balance is the raw integer sum from IC-AI; the webview converts it for display (÷100).
	 */
	async fetchBalanceRPC(): Promise<BalanceResponse | undefined> {
		try {
			const userInfo = await this.fetchUserInfo()
			if (!userInfo) {
				return undefined
			}
			return {
				balance: userInfo.credits.remainingCredits,
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
