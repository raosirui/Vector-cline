import { BRAND_NAME } from "@shared/brand"
import { isClineInternalTester } from "@shared/internal/account"
import type { UserOrganization } from "@shared/proto/cline/account"
import { EmptyRequest } from "@shared/proto/cline/common"
import { VSCodeButton, VSCodeDivider, VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { useInterval } from "react-use"
import { type ClineUser, handleSignOut } from "@/context/ClineAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { AccountServiceClient } from "@/services/grpc-client"
import ViewHeader from "../common/ViewHeader"
import { updateSetting } from "../settings/utils/settingsHandlers"
import { AccountWelcomeView } from "./AccountWelcomeView"
import { CreditBalance } from "./CreditBalance"

type AccountViewProps = {
	clineUser: ClineUser | null
	organizations: UserOrganization[] | null
	activeOrganization: UserOrganization | null
	onDone: () => void
}

const ClineEnvOptions = ["Production", "Staging", "Local"] as const

const AccountView = ({ onDone, clineUser }: AccountViewProps) => {
	const { environment } = useExtensionState()

	return (
		<div className="fixed inset-0 flex flex-col overflow-hidden">
			<ViewHeader environment={environment} onDone={onDone} showEnvironmentSuffix title="Account" />
			<div className="grow flex flex-col px-5 overflow-y-auto">
				{clineUser?.uid ? (
					<ICAIAccountView
						clineEnv={environment === "local" ? "Local" : environment === "staging" ? "Staging" : "Production"}
						clineUser={clineUser}
					/>
				) : (
					<AccountWelcomeView />
				)}
			</div>
		</div>
	)
}

const ICAIAccountView = ({ clineUser, clineEnv }: { clineUser: ClineUser; clineEnv: "Production" | "Staging" | "Local" }) => {
	const { email, displayName, appBaseUrl, uid } = clineUser
	const { environment } = useExtensionState()

	const [balance, setBalance] = useState<number | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now())

	const isClineTester = useMemo(() => (email ? isClineInternalTester(email) : false), [email])
	const baseUrl = appBaseUrl || "https://vectoraifae.online"

	const fetchCredits = useCallback(async () => {
		try {
			setIsLoading(true)
			const response = await AccountServiceClient.getUserCredits(EmptyRequest.create())
			const newBalance = response?.balance?.currentBalance
			setBalance(newBalance ?? null)
		} catch (error) {
			console.error("Failed to fetch credits:", error)
		} finally {
			setLastFetchTime(Date.now())
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchCredits()
	}, [])

	useInterval(() => {
		fetchCredits()
	}, 60000)

	const creditsUrl = new URL("/settings", baseUrl)

	return (
		<div className="h-full flex flex-col">
			<div className="flex flex-col h-full">
				<div className="flex flex-col w-full gap-1 mb-6">
					<div className="flex items-center flex-wrap gap-y-4">
						<div className="size-16 rounded-full bg-button-background flex items-center justify-center text-2xl text-button-foreground mr-4">
							{displayName?.[0] || email?.[0] || "?"}
						</div>

						<div className="flex flex-col">
							{displayName && <h2 className="text-foreground m-0 text-lg font-medium">{displayName}</h2>}
							{email && <div className="text-sm text-description">{email}</div>}
						</div>
					</div>
				</div>

				<div className="w-full flex gap-2 flex-col min-[225px]:flex-row">
					<VSCodeButton appearance="secondary" className="w-full" onClick={() => handleSignOut()}>
						Log out
					</VSCodeButton>
				</div>

				<VSCodeDivider className="w-full my-6" />

				<CreditBalance
					balance={balance}
					creditUrl={creditsUrl}
					fetchCreditBalance={fetchCredits}
					isLoading={isLoading}
					lastFetchTime={lastFetchTime}
				/>

				{isClineTester && environment !== "selfHosted" && (
					<div className="w-full gap-1 items-end">
						<VSCodeDivider className="w-full my-3" />
						<div className="text-sm font-semibold">{BRAND_NAME} Environment</div>
						<VSCodeDropdown
							className="w-full mt-1"
							currentValue={clineEnv}
							onChange={async (e) => {
								const target = e.target as HTMLSelectElement
								if (target?.value) {
									const value = target.value as "Local" | "Staging" | "Production"
									updateSetting("clineEnv", value.toLowerCase())
								}
							}}>
							{ClineEnvOptions.map((env) => (
								<VSCodeOption key={env} value={env}>
									{env}
								</VSCodeOption>
							))}
						</VSCodeDropdown>
					</div>
				)}
			</div>
		</div>
	)
}

export default memo(AccountView)
