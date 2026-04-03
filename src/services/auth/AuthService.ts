import { AuthState, UserInfo } from "@shared/proto/cline/account"
import { type EmptyRequest, String } from "@shared/proto/cline/common"
import { ClineEnv } from "@/config"
import { Controller } from "@/core/controller"
import { getRequestRegistry, type StreamingResponseHandler } from "@/core/controller/grpc-handler"
import { setWelcomeViewCompleted } from "@/core/controller/state/setWelcomeViewCompleted"
import { HostProvider } from "@/hosts/host-provider"
import { telemetryService } from "@/services/telemetry"
import { Logger } from "@/shared/services/Logger"
import { openExternal } from "@/utils/env"
import { BannerService } from "../banner/BannerService"
import { featureFlagsService } from "../feature-flags"
import { ClineAuthProvider } from "./providers/ClineAuthProvider"
import { LogoutReason } from "./types"

export type ServiceConfig = {
	URI?: string
	[key: string]: any
}

export interface ClineAuthInfo {
	idToken: string
	refreshToken?: string
	expiresAt?: number
	userInfo: ClineAccountUserInfo
	provider: string
	startedAt?: number
}

export interface ClineAccountUserInfo {
	createdAt: string
	displayName: string
	email: string
	id: string
	image?: string
	organizations: ClineAccountOrganization[]
	appBaseUrl?: string
	subject?: string
}

export interface ClineAccountOrganization {
	active: boolean
	memberId: string
	name: string
	organizationId: string
	roles: string[]
}

export class AuthService {
	protected static instance: AuthService | null = null
	protected _authenticated = false
	protected _clineAuthInfo: ClineAuthInfo | null = null
	protected _provider: ClineAuthProvider
	protected _activeAuthStatusUpdateHandlers = new Set<StreamingResponseHandler<AuthState>>()
	protected _handlerToController = new Map<StreamingResponseHandler<AuthState>, Controller>()
	protected _controller: Controller

	protected constructor(controller: Controller) {
		this._provider = new ClineAuthProvider()
		this._controller = controller
	}

	public static getInstance(controller?: Controller): AuthService {
		if (!AuthService.instance) {
			if (!controller) {
				Logger.warn("Extension context was not provided to AuthService.getInstance, using default context")
				controller = {} as Controller
			}
			if (process.env.E2E_TEST) {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				const { AuthServiceMock } = require("./AuthServiceMock")
				AuthService.instance = AuthServiceMock.getInstance(controller)
			} else {
				AuthService.instance = new AuthService(controller)
			}
			BannerService.initialize(controller)
		}
		if (controller !== undefined && AuthService.instance) {
			AuthService.instance.controller = controller
		}
		return AuthService.instance!
	}

	set controller(controller: Controller) {
		this._controller = controller
	}

	/**
	 * Returns the stored JWT token for authenticated API requests.
	 */
	async getAuthToken(): Promise<string | null> {
		if (!this._clineAuthInfo?.idToken || !this._authenticated) {
			return null
		}

		const expiresAt = this._clineAuthInfo.expiresAt || 0
		if (expiresAt < Date.now() / 1000) {
			Logger.info("IC-AI JWT expired, clearing auth state")
			this._clineAuthInfo = null
			this._authenticated = false
			this.destroyTokens()
			setImmediate(() => {
				this.sendAuthStatusUpdate().catch((error) => {
					Logger.error("Error sending auth status update after token expiry:", error)
				})
			})
			return null
		}

		return this._clineAuthInfo.idToken
	}

	getActiveOrganizationId(): string | null {
		return null
	}

	getUserOrganizations(): ClineAccountOrganization[] | undefined {
		return this._clineAuthInfo?.userInfo?.organizations
	}

	getProviderName(): string | null {
		return this._clineAuthInfo?.provider ?? null
	}

	getInfo(): AuthState {
		let user: any = null
		if (this._clineAuthInfo && this._authenticated) {
			const userInfo = this._clineAuthInfo.userInfo
			user = UserInfo.create({
				uid: userInfo?.id,
				displayName: userInfo?.displayName,
				email: userInfo?.email,
				photoUrl: userInfo?.image,
				appBaseUrl: ClineEnv.config()?.appBaseUrl,
			})
		}

		return AuthState.create({
			user,
		})
	}

	async createAuthRequest(strict = false): Promise<String> {
		if (strict && this._authenticated) {
			this.sendAuthStatusUpdate()
			return String.create({ value: "Already authenticated" })
		}

		const callbackUrl = await HostProvider.get().getCallbackUrl("/auth")
		const authUrl = await this._provider.getAuthRequest(callbackUrl)

		await openExternal(authUrl)
		telemetryService.captureAuthStarted(this._provider.name)
		return String.create({ value: authUrl })
	}

	async handleDeauth(reason: LogoutReason = LogoutReason.UNKNOWN): Promise<void> {
		try {
			telemetryService.captureAuthLoggedOut(this._provider.name, reason)
			this._clineAuthInfo = null
			this._authenticated = false
			this._provider.clearPendingState()
			this.destroyTokens()
			this.sendAuthStatusUpdate()
		} catch (error) {
			Logger.error("Error signing out:", error)
			throw error
		}
	}

	async handleAuthCallback(token: string, provider: string, state: string | null = null): Promise<void> {
		try {
			if (!this._provider.validateAndConsumeState(state)) {
				Logger.warn("Auth callback state mismatch — ignoring stale callback")
				return
			}

			this._clineAuthInfo = await this._provider.signIn(this._controller, token, provider)
			this._authenticated = this._clineAuthInfo?.idToken !== undefined

			telemetryService.captureAuthSucceeded(this._provider.name)
			await setWelcomeViewCompleted(this._controller, { value: true })
		} catch (error) {
			Logger.error("Error signing in with IC-AI token:", error)
			telemetryService.captureAuthFailed(this._provider.name)
			throw error
		} finally {
			await this.sendAuthStatusUpdate()
		}
	}

	async clearAuthToken(): Promise<void> {
		this.destroyTokens()
	}

	/**
	 * Restores authentication from stored secrets on extension activation.
	 * Since IC-AI uses long-lived JWTs (30 days), no refresh is needed --
	 * just check if the token is still valid.
	 */
	async restoreRefreshTokenAndRetrieveAuthInfo(): Promise<void> {
		try {
			this._clineAuthInfo = await this._provider.retrieveClineAuthInfo(this._controller)
			if (this._clineAuthInfo) {
				this._authenticated = true
				await this.sendAuthStatusUpdate()
			} else {
				Logger.warn("No valid auth session found")
				this._authenticated = false
				this._clineAuthInfo = null
			}
		} catch (error) {
			Logger.error("Error restoring auth token:", error)
			this._authenticated = false
			this._clineAuthInfo = null
		}
	}

	async subscribeToAuthStatusUpdate(
		controller: Controller,
		_request: EmptyRequest,
		responseStream: StreamingResponseHandler<AuthState>,
		requestId?: string,
	): Promise<void> {
		this._activeAuthStatusUpdateHandlers.add(responseStream)
		this._handlerToController.set(responseStream, controller)
		const cleanup = () => {
			this._activeAuthStatusUpdateHandlers.delete(responseStream)
			this._handlerToController.delete(responseStream)
		}
		if (requestId) {
			getRequestRegistry().registerRequest(requestId, cleanup, { type: "authStatusUpdate_subscription" }, responseStream)
		}

		try {
			await this.sendAuthStatusUpdate()
		} catch (error) {
			Logger.error("Error sending initial auth status:", error)
			this._activeAuthStatusUpdateHandlers.delete(responseStream)
			this._handlerToController.delete(responseStream)
		}
	}

	async sendAuthStatusUpdate(): Promise<void> {
		const authInfo: AuthState = this.getInfo()
		const uniqueControllers = new Set<Controller>()

		const streamSends = Array.from(this._activeAuthStatusUpdateHandlers).map(async (responseStream) => {
			const controller = this._handlerToController.get(responseStream)
			if (controller) {
				uniqueControllers.add(controller)
			}
			try {
				await responseStream(authInfo, false)
			} catch (error) {
				Logger.error("Error sending authStatusUpdate event:", error)
				this._activeAuthStatusUpdateHandlers.delete(responseStream)
				this._handlerToController.delete(responseStream)
			}
		})

		await Promise.all(streamSends)

		if (this._clineAuthInfo?.userInfo?.id) {
			telemetryService.identifyAccount(this._clineAuthInfo.userInfo)
			await featureFlagsService.poll(this._clineAuthInfo.userInfo?.id)
		} else {
			await featureFlagsService.poll(null)
		}

		BannerService.onAuthUpdate(this._clineAuthInfo?.userInfo?.id || null).catch((error) => {
			Logger.error("[AuthService] Banner update failed", error)
		})

		await Promise.all(Array.from(uniqueControllers).map((c) => c.postStateToWebview()))
	}

	private destroyTokens() {
		this._controller.stateManager.setSecret("clineAccountId", undefined)
		this._controller.stateManager.setSecret("cline:clineAccountId", undefined)
	}
}
