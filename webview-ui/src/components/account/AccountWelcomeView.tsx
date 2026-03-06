import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { BRAND_LINKS, brandText, isBrandLinkConfigured } from "@shared/brand"
import { useClineSignIn } from "@/context/ClineAuthContext"
import { useExtensionState } from "@/context/ExtensionStateContext"
import ClineLogoVariable from "../../assets/ClineLogoVariable"

// export const AccountWelcomeView = () => (
// 	<div className="flex flex-col items-center pr-3 gap-2.5">
// 		<ClineLogoWhite className="size-16 mb-4" />
export const AccountWelcomeView = () => {
	const { environment } = useExtensionState()
	const { isLoginLoading, handleSignIn } = useClineSignIn()

	return (
		<div className="flex flex-col items-center gap-2.5">
			<ClineLogoVariable className="size-16 mb-4" environment={environment} />

			<p>
				Sign up for an account to get access to the latest models, billing dashboard to view usage and credits, and more
				upcoming features.
			</p>

			<VSCodeButton className="w-full mb-4" disabled={isLoginLoading} onClick={handleSignIn}>
				{brandText.signInWithBrand}
				{isLoginLoading && (
					<span className="ml-1 animate-spin">
						<span className="codicon codicon-refresh"></span>
					</span>
				)}
			</VSCodeButton>

			<p className="text-(--vscode-descriptionForeground) text-xs text-center m-0">
				By continuing, you agree to the{" "}
				{isBrandLinkConfigured(BRAND_LINKS.website) ? (
					<VSCodeLink href={`${BRAND_LINKS.website}/tos`}>Terms of Service</VSCodeLink>
				) : (
					"Terms of Service"
				)}{" "}
				and{" "}
				{isBrandLinkConfigured(BRAND_LINKS.privacy) ? (
					<VSCodeLink href={BRAND_LINKS.privacy}>Privacy Policy.</VSCodeLink>
				) : (
					"Privacy Policy."
				)}
			</p>
		</div>
	)
}
