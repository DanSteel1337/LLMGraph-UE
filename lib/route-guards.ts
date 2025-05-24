"use client"

import { useAuth } from "./auth-singleton"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

// ✅ GLOBAL REDIRECT TRACKING - Prevents multiple redirects
let globalRedirectState = {
  isRedirecting: false,
  lastRedirect: "",
  redirectCount: 0,
}

// ✅ SAFE NAVIGATION HELPER
function safeNavigate(router: ReturnType<typeof useRouter>, path: string, reason: string) {
  // Prevent multiple redirects
  if (globalRedirectState.isRedirecting) {
    console.log(`[NAVIGATION] Blocked redirect to ${path} - already redirecting`)
    return false
  }

  // Prevent redirect loops
  if (globalRedirectState.lastRedirect === path) {
    console.log(`[NAVIGATION] Blocked redirect to ${path} - same as last redirect`)
    return false
  }

  // Prevent too many redirects
  if (globalRedirectState.redirectCount > 3) {
    console.error(`[NAVIGATION] Blocked redirect to ${path} - too many redirects`)
    return false
  }

  console.log(`[NAVIGATION] Safe redirect to ${path} - ${reason}`)

  globalRedirectState.isRedirecting = true
  globalRedirectState.lastRedirect = path
  globalRedirectState.redirectCount++

  // Use replace to avoid history pollution
  router.replace(path)

  // Reset redirect state after navigation
  setTimeout(() => {
    globalRedirectState.isRedirecting = false
  }, 1000)

  return true
}

// ✅ RESET REDIRECT STATE - Call when navigation completes
export function resetNavigationState() {
  globalRedirectState = {
    isRedirecting: false,
    lastRedirect: "",
    redirectCount: 0,
  }
  console.log("[NAVIGATION] State reset")
}

// ✅ AUTH GUARD HOOK - Handles auth-based redirects safely
export function useAuthGuard(
  options: {
    requireAuth?: boolean
    redirectTo?: string
    allowedRoles?: string[]
  } = {},
) {
  const { requireAuth = true, redirectTo } = options
  const { user, loading, isInitialized } = useAuth()
  const router = useRouter()
  const hasCheckedAuth = useRef(false)
  const [shouldRender, setShouldRender] = useState(false)
  const { navigate, navigateWithAuth } = useNavigate()

  useEffect(() => {
    // ✅ WAIT FOR AUTH INITIALIZATION
    if (!isInitialized || loading) {
      setShouldRender(false)
      return
    }

    // ✅ PREVENT MULTIPLE CHECKS
    if (hasCheckedAuth.current) {
      return
    }

    hasCheckedAuth.current = true

    // ✅ AUTH REQUIRED BUT NO USER
    if (requireAuth && !user) {
      const targetPath = redirectTo || "/auth/login"
      const success = navigate(targetPath, "Auth required")
      if (success) {
        setShouldRender(false)
      }
      return
    }

    // ✅ NO AUTH REQUIRED BUT USER EXISTS
    if (!requireAuth && user) {
      const targetPath = redirectTo || "/dashboard"
      const success = navigate(targetPath, "Already authenticated")
      if (success) {
        setShouldRender(false)
      }
      return
    }

    // ✅ AUTH STATE MATCHES REQUIREMENTS
    setShouldRender(true)
    console.log(`[AUTH GUARD] Rendering allowed - requireAuth: ${requireAuth}, hasUser: ${!!user}`)
  }, [isInitialized, loading, user, requireAuth, redirectTo]) // ✅ NO ROUTER DEPENDENCY

  return {
    shouldRender,
    isLoading: !isInitialized || loading,
    user,
    isAuthenticated: !!user,
    navigate,
    navigateWithAuth,
  }
}

// ✅ PROTECTED ROUTE WRAPPER
export function useProtectedRoute(redirectTo = "/auth/login") {
  return useAuthGuard({ requireAuth: true, redirectTo })
}

// ✅ PUBLIC ROUTE WRAPPER (redirects authenticated users)
export function usePublicRoute(redirectTo = "/dashboard") {
  return useAuthGuard({ requireAuth: false, redirectTo })
}

// ✅ MANUAL NAVIGATION HELPER
export function useNavigate() {
  const router = useRouter()

  const navigate = (path: string, reason = "Manual navigation") => {
    return safeNavigate(router, path, reason)
  }

  const navigateWithAuth = (path: string, requireAuth = true) => {
    const { user } = useAuth()

    if (requireAuth && !user) {
      return safeNavigate(router, "/auth/login", "Auth required for navigation")
    }

    if (!requireAuth && user) {
      return safeNavigate(router, "/dashboard", "Already authenticated")
    }

    return safeNavigate(router, path, "Conditional navigation")
  }

  return { navigate, navigateWithAuth }
}

// ✅ LOADING COMPONENT FOR GUARDS
export function AuthGuardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Checking authentication...</p>
      </div>
    </div>
  )
}

// ✅ DEBUG HELPER
export function getNavigationState() {
  return {
    ...globalRedirectState,
    timestamp: new Date().toISOString(),
  }
}
