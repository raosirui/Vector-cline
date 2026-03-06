import fs from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, "utf8"))
const writeJson = async (filePath, value) =>
	await fs.writeFile(filePath, `${JSON.stringify(value, null, "\t")}\n`, "utf8")
const exists = async (filePath) =>
	fs
		.access(filePath)
		.then(() => true)
		.catch(() => false)

const replaceTextFile = async (filePath, replacements) => {
	const original = await fs.readFile(filePath, "utf8")
	let updated = original
	for (const [from, to] of replacements) {
		updated = updated.replaceAll(from, to)
	}
	if (updated !== original) {
		await fs.writeFile(filePath, updated, "utf8")
	}
}

const walk = async (dirPath, extensions) => {
	if (!(await exists(dirPath))) {
		return []
	}
	const entries = await fs.readdir(dirPath, { withFileTypes: true })
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(dirPath, entry.name)
			if (entry.isDirectory()) {
				return walk(fullPath, extensions)
			}
			return extensions.includes(path.extname(entry.name)) ? [fullPath] : []
		}),
	)
	return files.flat()
}

const brand = await readJson(path.join(root, "brand.config.json"))

const rootPackagePath = path.join(root, "package.json")
const cliPackagePath = path.join(root, "cli", "package.json")
const docsConfigPath = path.join(root, "docs", "docs.json")
const webviewIndexPath = path.join(root, "webview-ui", "index.html")

const rootPackage = await readJson(rootPackagePath)
rootPackage.name = brand.extension.packageName
rootPackage.displayName = brand.extension.displayName
rootPackage.description = brand.extension.description
rootPackage.author = { name: brand.companyName }
rootPackage.homepage = brand.links.website || undefined
rootPackage.repository = brand.links.github ? { type: "git", url: brand.links.github } : undefined
rootPackage.keywords = Array.from(new Set([brand.productName.toLowerCase(), "coding", "agent", "ai"]))
if (rootPackage.contributes?.walkthroughs?.[0]) {
	rootPackage.contributes.walkthroughs[0].title = `Meet ${brand.productName}, your new coding partner`
	rootPackage.contributes.walkthroughs[0].description =
		`${brand.productName} codes like a developer because it thinks like one. Here are 5 ways to put it to work:`
}
if (rootPackage.contributes?.viewsContainers?.activitybar?.[0]) {
	rootPackage.contributes.viewsContainers.activitybar[0].title = brand.extension.displayName
}
if (rootPackage.contributes?.configuration) {
	rootPackage.contributes.configuration.title = brand.extension.displayName
}
for (const command of rootPackage.contributes?.commands ?? []) {
	if (command.category === "Cline") {
		command.category = brand.productName
	}
	if (typeof command.title === "string") {
		command.title = command.title.replaceAll("Cline CLI", brand.cli.displayName).replaceAll("Cline", brand.productName)
	}
}
await writeJson(rootPackagePath, rootPackage)

const cliPackage = await readJson(cliPackagePath)
cliPackage.name = brand.cli.packageName
cliPackage.description = brand.cli.description
cliPackage.author = { name: brand.companyName }
cliPackage.bin = { [brand.cli.commandName]: "./dist/cli.mjs" }
cliPackage.homepage = brand.links.website || undefined
cliPackage.repository = brand.links.github ? { type: "git", url: brand.links.github } : undefined
cliPackage.bugs = brand.links.issues ? { url: brand.links.issues } : undefined
cliPackage.keywords = Array.from(new Set([brand.productName.toLowerCase(), "coding", "agent", "ai", "cli"]))
await writeJson(cliPackagePath, cliPackage)

const docsConfig = await readJson(docsConfigPath)
docsConfig.name = brand.productName
docsConfig.description = brand.tagline
if (docsConfig.navbar?.primary) {
	docsConfig.navbar.primary.label = `Install ${brand.productName}`
	docsConfig.navbar.primary.href = brand.links.website ? `${brand.links.website}/install` : undefined
}
if (docsConfig.navbar) {
	docsConfig.navbar.links = [
		brand.links.github ? { label: "GitHub", icon: "github", href: brand.links.github } : null,
		brand.links.discord ? { label: "Discord", icon: "discord", href: brand.links.discord } : null,
	].filter(Boolean)
}
if (docsConfig.footer?.socials) {
	docsConfig.footer.socials = Object.fromEntries(
		Object.entries({
			x: brand.links.x,
			github: brand.links.github,
			discord: brand.links.discord,
		}).filter(([, value]) => value),
	)
}
if (docsConfig.search) {
	docsConfig.search.prompt = `Search ${brand.productName} documentation...`
}
await writeJson(docsConfigPath, docsConfig)

const webviewIndex = await fs.readFile(webviewIndexPath, "utf8")
await fs.writeFile(webviewIndexPath, webviewIndex.replace(/<title>.*<\/title>/, `<title>${brand.productName}</title>`), "utf8")

const docFiles = [
	path.join(root, "README.md"),
	path.join(root, "cli", "README.md"),
	path.join(root, "cli", "man", "cline.1.md"),
	...(await walk(path.join(root, "locales"), [".md"])),
	...(await walk(path.join(root, "walkthrough"), [".md"])),
	...(await walk(path.join(root, "docs"), [".md", ".mdx"])),
]

for (const filePath of docFiles) {
	await replaceTextFile(filePath, [
		["Cline CLI", brand.cli.displayName],
		["Cline", brand.productName],
	])
}

const targetedUiFiles = [
	path.join(root, "webview-ui", "src", "components", "settings", "BasetenModelPicker.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "OpenRouterModelPicker.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "RequestyModelPicker.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "GroqModelPicker.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "ClineModelPicker.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "providers", "OpenAICompatible.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "providers", "TogetherProvider.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "providers", "NousresearchProvider.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "providers", "XaiProvider.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "providers", "NebiusProvider.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "providers", "OllamaProvider.tsx"),
	path.join(root, "webview-ui", "src", "components", "settings", "providers", "LMStudioProvider.tsx"),
]

for (const filePath of targetedUiFiles) {
	if (!(await exists(filePath))) {
		continue
	}
	await replaceTextFile(filePath, [
		["Cline uses complex prompts and works best with", `${brand.productName} uses complex prompts and works best with`],
		["Cline works best with", `${brand.productName} works best with`],
		["latest Cline model list", `latest ${brand.productName} model list`],
		["Cline model list", `${brand.productName} model list`],
	])
}

console.log(`Synchronized branding for ${brand.productName}.`)
