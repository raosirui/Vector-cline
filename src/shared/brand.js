import brandConfig from "../../brand.config.json";
const toOptionalLink = (value) => (value.trim() ? value : undefined);
export const BRAND_CONFIG = brandConfig;
export const BRAND_NAME = brandConfig.productName;
export const BRAND_ASSISTANT_NAME = brandConfig.assistantName;
export const BRAND_COMPANY_NAME = brandConfig.companyName;
export const BRAND_TAGLINE = brandConfig.tagline;
export const BRAND_EXTENSION = brandConfig.extension;
export const BRAND_CLI = brandConfig.cli;
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
};
export const BRAND_COPY = brandConfig.copy;
export const brandText = {
    namedVersion: (version) => `${BRAND_NAME} v${version}`,
    welcomeVersion: (version) => `Welcome to ${BRAND_NAME} v${version}`,
    updatedVersion: (version) => `${BRAND_NAME} has been updated to v${version}`,
    aboutTitle: `About ${BRAND_NAME}`,
    helpImproveTitle: BRAND_COPY.telemetryTitle,
    signIn: `Sign in to ${BRAND_NAME}`,
    signInWithBrand: `Sign in with ${BRAND_NAME}`,
    waitingForSignIn: `Waiting for ${BRAND_NAME} sign-in...`,
    wantsTo: (action) => `${BRAND_NAME} wants to ${action}`,
    isDoing: (action) => `${BRAND_NAME} is ${action}`,
    hasThing: (thing) => `${BRAND_NAME} has ${thing}`,
    viewed: (thing) => `${BRAND_NAME} viewed ${thing}`,
    recursivelyViewed: (thing) => `${BRAND_NAME} recursively viewed ${thing}`,
    loaded: (thing) => `${BRAND_NAME} loaded ${thing}`,
    fetched: (thing) => `${BRAND_NAME} fetched ${thing}`,
    searched: (thing) => `${BRAND_NAME} searched ${thing}`,
    useSubagent: (count) => count === 1 ? `${BRAND_NAME} wants to use a subagent:` : `${BRAND_NAME} wants to use subagents:`,
    runSubagent: (count) => count === 1 ? `${BRAND_NAME} is running a subagent:` : `${BRAND_NAME} is running subagents:`,
};
export const isBrandLinkConfigured = (url) => Boolean(url);
//# sourceMappingURL=brand.js.map