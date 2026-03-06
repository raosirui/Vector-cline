import { HTMLAttributes } from "react"
import brandLogoSvg from "../../../assets/icons/icon.svg?raw"

type BrandLogoProps = HTMLAttributes<HTMLSpanElement> & {
	alt?: string
}

const sanitizedBrandLogoSvg = brandLogoSvg
	.replace(/<\?xml[\s\S]*?\?>\s*/i, "")
	.replace(/<svg\b/, '<svg width="100%" height="100%" style="display:block" preserveAspectRatio="xMidYMid meet"')

const BrandLogo = ({ alt = "Vector logo", className, ...props }: BrandLogoProps) => (
	<span
		aria-label={alt}
		className={className}
		role="img"
		{...props}
		dangerouslySetInnerHTML={{ __html: sanitizedBrandLogoSvg }}
	/>
)

export default BrandLogo
