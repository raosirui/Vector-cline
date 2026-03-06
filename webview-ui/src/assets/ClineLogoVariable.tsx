import { ComponentPropsWithoutRef } from "react"
import type { Environment } from "../../../src/shared/config-types"
import BrandLogo from "./BrandLogo"

/**
 * ClineLogoVariable renders the current brand logo asset.
 *
 * The `environment` prop is kept for compatibility with existing call sites.
 *
 * @param {ComponentPropsWithoutRef<"img"> & { environment?: Environment }} props - Standard img props plus optional environment
 * @returns {JSX.Element} Current brand logo
 */
const ClineLogoVariable = (props: ComponentPropsWithoutRef<"img"> & { environment?: Environment }) => {
	const { environment: _environment, ...imgProps } = props

	return <BrandLogo {...imgProps} />
}
export default ClineLogoVariable
