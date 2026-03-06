import brandConfig from "../../brand.config.json"

type OptionalLink = string | undefined

const toOptionalLink = (value: string): OptionalLink => (value.trim() ? value : undefined)

export const BRAND_CONFIG = brandConfig

export const BRAND_NAME = brandConfig.productName
export const BRAND_ASSISTANT_NAME = brandConfig.assistantName
export const BRAND_COMPANY_NAME = brandConfig.companyName
export const BRAND_TAGLINE = brandConfig.tagline

export const BRAND_EXTENSION = brandConfig.extension
export const BRAND_CLI = brandConfig.cli

export const BRAND_LINKS = {
	website: toOptionalLink(brandConfig.links.website),
	documentation: toOptionalLink(brandConfig.links.documentation),
	privacy: toOptionalLink(brandConfig.links.privacy),
	github: toOptionalLink(brandConfig.links.github),
	issues: toOptionalLink(brandConfig.links.issues),
	featureRequests: toOptionalLink(brandConfig.links.featureRequests),
	x: toOptionalLink(brandConfig.links.x),
	discord: toOptionalLink(brandConfig.links.discord),
	reddit: toOptionalLink(brandConfig.links.reddit),
	learn: toOptionalLink(brandConfig.links.learn),
}

export const BRAND_COPY = brandConfig.copy

export const brandText = {
	namedVersion: (version: string) => `${BRAND_NAME} v${version}`,
	welcomeVersion: (version: string) => `Welcome to ${BRAND_NAME} v${version}`,
	updatedVersion: (version: string) => `${BRAND_NAME} has been updated to v${version}`,
	aboutTitle: `About ${BRAND_NAME}`,
	helpImproveTitle: BRAND_COPY.telemetryTitle,
	signIn: `Sign in to ${BRAND_NAME}`,
	signInWithBrand: `Sign in with ${BRAND_NAME}`,
	waitingForSignIn: `Waiting for ${BRAND_NAME} sign-in...`,
	wantsTo: (action: string) => `${BRAND_NAME} wants to ${action}`,
	isDoing: (action: string) => `${BRAND_NAME} is ${action}`,
	hasThing: (thing: string) => `${BRAND_NAME} has ${thing}`,
	viewed: (thing: string) => `${BRAND_NAME} viewed ${thing}`,
	recursivelyViewed: (thing: string) => `${BRAND_NAME} recursively viewed ${thing}`,
	loaded: (thing: string) => `${BRAND_NAME} loaded ${thing}`,
	fetched: (thing: string) => `${BRAND_NAME} fetched ${thing}`,
	searched: (thing: string) => `${BRAND_NAME} searched ${thing}`,
	useSubagent: (count: number) =>
		count === 1 ? `${BRAND_NAME} wants to use a subagent:` : `${BRAND_NAME} wants to use subagents:`,
	runSubagent: (count: number) =>
		count === 1 ? `${BRAND_NAME} is running a subagent:` : `${BRAND_NAME} is running subagents:`,
}

export const isBrandLinkConfigured = (url: OptionalLink): url is string => Boolean(url)
