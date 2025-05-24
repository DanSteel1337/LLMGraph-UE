"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./use-auth"

export function useProtectedRoute(redirectTo = "/auth/login") {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  return { user, loading }
}

export function usePublicRoute(redirectTo = "/dashboard") {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  return { user, loading }
}
