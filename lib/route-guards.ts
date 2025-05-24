/**
 * Route Guards for Authentication
 *
 * Purpose: Protect routes based on authentication state
 * Pattern: Hooks that check auth and handle redirects
 *
 * IMPORTANT: This file must remain .ts (not .tsx) to avoid import issues
 * JSX components are imported from separate .tsx files
 */
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-singleton"

// Replace this line:
// export { AuthGuardLoading } from "../app/components/ui/auth-loading"

// With this import statement:
import AuthGuardLoading from "../app/components/ui/auth-loading"
export { AuthGuardLoading }

// ✅ NAVIGATION STATE - Prevents redirect loops
let isNavigating = false
let lastNavigationTarget: string | null = null
let navigationTimeout: NodeJS.Timeout | null = null

// ✅ RESET NAVIGATION STATE - Call this when navigation completes
export function resetNavigationState() {
  isNavigating = false
  lastNavigationTarget = null
  if (navigationTimeout) {
    clearTimeout(navigationTimeout)
    navigationTimeout = null
  }
}

// ✅ SAFE NAVIGATION - Prevents multiple redirects
function safeNavigate(router: ReturnType<typeof useRouter>, target: string) {
  // Prevent duplicate navigation
  if (isNavigating && lastNavigationTarget === target) {
    console.log("[ROUTE GUARD] Already navigating to:", target)
    return
  }

  // Prevent navigation loops
  if (window.location.pathname === target) {
    console.log("[ROUTE GUARD] Already at target:", target)
    return
  }

  console.log("[ROUTE GUARD] Navigating to:", target)
  isNavigating = true
  lastNavigationTarget = target

  // Set timeout to reset navigation state
  if (navigationTimeout) clearTimeout(navigationTimeout)
  navigationTimeout = setTimeout(() => {
    resetNavigationState()
  }, 5000) // Reset after 5 seconds if navigation doesn't complete

  router.push(target)
}

/**
 * Protected Route Guard
 * Use this for routes that require authentication
 *
 * @param redirectTo - Where to redirect unauthenticated users
 * @returns { shouldRender, isLoading, user, navigate }
 */
export function useProtectedRoute(redirectTo = "/auth/login") {
  const { user, loading, isInitialized } = useAuth()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Wait for auth to initialize
    if (!isInitialized || loading) {
      console.log("[PROTECTED ROUTE] Waiting for auth initialization")
      return
    }

    // Check authentication
    if (!user) {
      console.log("[PROTECTED ROUTE] No user, redirecting to:", redirectTo)
      setShouldRender(false)
      safeNavigate(router, redirectTo)
    } else {
      console.log("[PROTECTED ROUTE] User authenticated:", user.email)
      setShouldRender(true)
      resetNavigationState() // Clear navigation state when auth is confirmed
    }
  }, [user, loading, isInitialized, router, redirectTo])

  return {
    shouldRender: shouldRender && !loading && !!user,
    isLoading: loading || !isInitialized,
    user,
    navigate: (path: string) => safeNavigate(router, path),
  }
}

/**
 * Public Route Guard
 * Use this for routes that should redirect authenticated users
 *
 * @param redirectTo - Where to redirect authenticated users
 * @returns { shouldRender, isLoading, user, navigate }
 */
export function usePublicRoute(redirectTo = "/dashboard") {
  const { user, loading, isInitialized } = useAuth()
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Wait for auth to initialize
    if (!isInitialized || loading) {
      console.log("[PUBLIC ROUTE] Waiting for auth initialization")
      return
    }

    // Check authentication
    if (user) {
      console.log("[PUBLIC ROUTE] User authenticated, redirecting to:", redirectTo)
      setShouldRender(false)
      safeNavigate(router, redirectTo)
    } else {
      console.log("[PUBLIC ROUTE] No user, showing public page")
      setShouldRender(true)
      resetNavigationState() // Clear navigation state when showing public page
    }
  }, [user, loading, isInitialized, router, redirectTo])

  return {
    shouldRender: shouldRender && !loading && !user,
    isLoading: loading || !isInitialized,
    user,
    navigate: (path: string) => safeNavigate(router, path),
  }
}

/**
 * Optional Auth Route
 * Use this for routes that work with or without authentication
 *
 * @returns { isLoading, user, navigate }
 */
export function useOptionalAuth() {
  const { user, loading, isInitialized } = useAuth()
  const router = useRouter()

  return {
    isLoading: loading || !isInitialized,
    user,
    navigate: (path: string) => safeNavigate(router, path),
  }
}
