import { useEffect, useRef, useState } from "react"
import { formatCreditsBalance } from "@/utils/format"

const useAnimatedCredits = (targetValue: number, duration = 660) => {
	const [currentValue, setCurrentValue] = useState(0)
	const animationRef = useRef<number>()
	const startTimeRef = useRef<number>()

	useEffect(() => {
		const animate = (timestamp: number) => {
			if (!startTimeRef.current) {
				startTimeRef.current = timestamp
			}

			const elapsed = timestamp - startTimeRef.current
			const progress = Math.min(elapsed / duration, 1)

			const easedProgress = 1 - (1 - progress) ** 3
			const newValue = easedProgress * targetValue

			setCurrentValue(newValue)

			if (progress < 1) {
				animationRef.current = requestAnimationFrame(animate)
			}
		}

		startTimeRef.current = undefined
		animationRef.current = requestAnimationFrame(animate)

		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current)
			}
		}
	}, [targetValue, duration])

	return currentValue
}

export const StyledCreditDisplay = ({ balance }: { balance: number }) => {
	const displayBalance = formatCreditsBalance(balance)
	const animatedValue = useAnimatedCredits(displayBalance)

	return <span className="font-azeret-mono font-light tabular-nums text-2xl">{animatedValue.toFixed(2)}</span>
}
