import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { BRAND_COPY, BRAND_LINKS, brandText, isBrandLinkConfigured } from "@shared/brand"
import Section from "../Section"

interface AboutSectionProps {
	version: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}
const AboutSection = ({ version, renderSectionHeader }: AboutSectionProps) => {
	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className="flex px-4 flex-col gap-2">
					<h2 className="text-lg font-semibold">{brandText.namedVersion(version)}</h2>
					<p>
						{BRAND_COPY.aboutDescription}
					</p>

					{(isBrandLinkConfigured(BRAND_LINKS.x) ||
						isBrandLinkConfigured(BRAND_LINKS.discord) ||
						isBrandLinkConfigured(BRAND_LINKS.reddit)) && (
						<>
							<h3 className="text-md font-semibold">Community & Support</h3>
							<p>
								{isBrandLinkConfigured(BRAND_LINKS.x) && <VSCodeLink href={BRAND_LINKS.x}>X</VSCodeLink>}
								{isBrandLinkConfigured(BRAND_LINKS.x) && isBrandLinkConfigured(BRAND_LINKS.discord) && " • "}
								{isBrandLinkConfigured(BRAND_LINKS.discord) && (
									<VSCodeLink href={BRAND_LINKS.discord}>Discord</VSCodeLink>
								)}
								{(isBrandLinkConfigured(BRAND_LINKS.x) || isBrandLinkConfigured(BRAND_LINKS.discord)) &&
									isBrandLinkConfigured(BRAND_LINKS.reddit) &&
									" • "}
								{isBrandLinkConfigured(BRAND_LINKS.reddit) && (
									<VSCodeLink href={BRAND_LINKS.reddit}>Community</VSCodeLink>
								)}
							</p>
						</>
					)}

					{(isBrandLinkConfigured(BRAND_LINKS.github) ||
						isBrandLinkConfigured(BRAND_LINKS.issues) ||
						isBrandLinkConfigured(BRAND_LINKS.featureRequests)) && (
						<>
							<h3 className="text-md font-semibold">Development</h3>
							<p>
								{isBrandLinkConfigured(BRAND_LINKS.github) && (
									<VSCodeLink href={BRAND_LINKS.github}>GitHub</VSCodeLink>
								)}
								{isBrandLinkConfigured(BRAND_LINKS.github) && isBrandLinkConfigured(BRAND_LINKS.issues) && " • "}
								{isBrandLinkConfigured(BRAND_LINKS.issues) && (
									<VSCodeLink href={BRAND_LINKS.issues}>Issues</VSCodeLink>
								)}
								{(isBrandLinkConfigured(BRAND_LINKS.github) || isBrandLinkConfigured(BRAND_LINKS.issues)) &&
									isBrandLinkConfigured(BRAND_LINKS.featureRequests) &&
									" • "}
								{isBrandLinkConfigured(BRAND_LINKS.featureRequests) && (
									<VSCodeLink href={BRAND_LINKS.featureRequests}>Feature Requests</VSCodeLink>
								)}
							</p>
						</>
					)}

					{(isBrandLinkConfigured(BRAND_LINKS.documentation) || isBrandLinkConfigured(BRAND_LINKS.website)) && (
						<>
							<h3 className="text-md font-semibold">Resources</h3>
							<p>
								{isBrandLinkConfigured(BRAND_LINKS.documentation) && (
									<VSCodeLink href={BRAND_LINKS.documentation}>Documentation</VSCodeLink>
								)}
								{isBrandLinkConfigured(BRAND_LINKS.documentation) && isBrandLinkConfigured(BRAND_LINKS.website) && " • "}
								{isBrandLinkConfigured(BRAND_LINKS.website) && (
									<VSCodeLink href={BRAND_LINKS.website}>{BRAND_LINKS.website}</VSCodeLink>
								)}
							</p>
						</>
					)}
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
