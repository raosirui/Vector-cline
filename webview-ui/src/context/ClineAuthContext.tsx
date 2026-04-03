import type { UserOrganization } from "@shared/proto/cline/account"
import { EmptyRequest } from "@shared/proto/cline/common"
import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { AccountServiceClient } from "@/services/grpc-client"

export interface ClineUser {
	uid: string
	email?: string
	displayName?: string
	photoUrl?: string
	appBaseUrl?: string
}

export interface ClineAuthContextType {
	clineUser: ClineUser | null
	organizations: UserOrganization[] | null
	activeOrganization: UserOrganization | null
}

export const ClineAuthContext = createContext<ClineAuthContextType | undefined>(undefined)

export const ClineAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<ClineUser | null>(null)

	useEffect(() => {
		console.log("Extension: ClineAuthContext: user updated:", user?.uid)
	}, [user?.uid])

	useEffect(() => {
		const cancelSubscription = AccountServiceClient.subscribeToAuthStatusUpdate(EmptyRequest.create(), {
			onResponse: async (response) => {
				setUser((oldUser) => {
					if (!response?.user?.uid) {
						return null
					}

					if (response?.user && oldUser?.uid !== response.user.uid) {
						return response.user
					}

					return oldUser
				})
			},
			onError: (error: Error) => {
				console.error("Error in auth callback subscription:", error)
			},
			onComplete: () => {
				console.log("Auth callback subscription completed")
			},
		})

		return () => {
			cancelSubscription()
		}
	}, [])

	return (
		<ClineAuthContext.Provider
			value={{
				clineUser: user,
				organizations: null,
				activeOrganization: null,
			}}>
			{children}
		</ClineAuthContext.Provider>
	)
}

export const useClineAuth = () => {
	const context = useContext(ClineAuthContext)
	if (context === undefined) {
		throw new Error("useClineAuth must be used within a ClineAuthProvider")
	}
	return context
}

export const useClineSignIn = () => {
	const [isLoading, setIsLoading] = useState(false)

	const handleSignIn = useCallback(() => {
		try {
			setIsLoading(true)

			AccountServiceClient.accountLoginClicked(EmptyRequest.create())
				.catch((err) => console.error("Failed to get login URL:", err))
				.finally(() => {
					setIsLoading(false)
				})
		} catch (error) {
			console.error("Error signing in:", error)
		}
	}, [])

	return {
		isLoginLoading: isLoading,
		handleSignIn,
	}
}

export const handleSignOut = async () => {
	try {
		await AccountServiceClient.accountLogoutClicked(EmptyRequest.create()).catch((err) =>
			console.error("Failed to logout:", err),
		)
	} catch (error) {
		console.error("Error signing out:", error)
		throw error
	}
}
