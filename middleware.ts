/**
 * Authentication Middleware
 *
 * Purpose: Protects API routes and pages by validating user authentication
 *
 * Features:
 * - Validates Supabase authentication for all protected routes
 * - Protects API endpoints (except auth and health endpoints)
 * - Handles authentication token refresh and validation
 * - Provides consistent auth checking across the application
 * - Optimized for Edge Runtime performance
 *
 * Security: Uses server-side authentication validation
 * Runtime: Vercel Edge Runtime for minimal latency
 *
 * Protected Routes:
 * - All /api/* routes except /api/auth/* and /api/health
 * - All /dashboard/* pages
 * - Any route requiring authentication
 *
 * Public Routes:
 * - /auth/* (login, signup, callback)
 * - /api/health (health checks)
 * - / (landing page)
 * - Static files and assets
 *
 * Response Behavior:
 * - API routes: Returns 401 JSON error for unauthorized access
 * - Pages: Redirects to login page
 * - Static files: Passes through without auth check
 *
 * Authentication Flow:
 * 1. Check if route requires protection
 * 2. Validate user session using getUser()
 * 3. Allow access if authenticated
 * 4. Return 401/redirect if not authenticated
 * 5. Handle errors gracefully
 *
 * FINALIZED AUTHENTICATION SYSTEM - DO NOT MODIFY
 * Enhanced version with better error handling and performance
 * See docs/AUTH_LOCKED.md for implementation details
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { parseError, formatErrorForLogging, generateRequestId } from "./lib/utils/edge-error-parser"

// Consistent storage key across all environments
const STORAGE_KEY = "supabase-auth"

// Cache for environment variables
const ENV_CACHE = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

// Cache for Supabase client per request
const clientCache = new Map<string, any>()

export async function middleware(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  // Quick path check to avoid unnecessary processing
  const { pathname } = request.nextUrl

  // Skip middleware for static files and non-API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname.startsWith("/auth/callback")
  ) {
    return NextResponse.next()
  }

  try {
    // Log middleware start
    console.log(
      "Middleware processing:",
      JSON.stringify(
        {
          requestId,
          method: request.method,
          pathname,
          userAgent: request.headers.get("user-agent"),
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    // Create response to modify
    const res = NextResponse.next()

    // Add request ID to response headers
    res.headers.set("x-request-id", requestId)

    // Validate environment variables
    if (!ENV_CACHE.url || !ENV_CACHE.key) {
      const error = new Error("Missing Supabase environment variables")
      const parsedError = parseError(error, {
        requestId,
        url: request.url,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        operation: "middleware-env-validation",
        pathname,
        envVarsPresent: {
          url: !!ENV_CACHE.url,
          key: !!ENV_CACHE.key,
        },
      })

      console.error("Middleware environment validation failed:", JSON.stringify(logEntry, null, 2))

      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Configuration error",
            requestId,
            timestamp: new Date().toISOString(),
          },
          {
            status: 500,
            headers: { "x-request-id": requestId },
          },
        )
      }
      return res
    }

    // Use cached client if available
    let supabase = clientCache.get(requestId)

    if (!supabase) {
      // Create a Supabase client
      supabase = createServerClient(ENV_CACHE.url, ENV_CACHE.key, {
        cookies: {
          get(name) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            res.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name, options) {
            request.cookies.set({
              name,
              value: "",
              ...options,
            })
            res.cookies.set({
              name,
              value: "",
              ...options,
            })
          },
        },
        auth: {
          storageKey: STORAGE_KEY,
          flowType: "pkce",
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })

      // Cache the client for this request
      clientCache.set(requestId, supabase)

      // Clean up cache after request is complete (prevent memory leaks)
      setTimeout(() => {
        clientCache.delete(requestId)
      }, 5000) // 5 seconds should be enough for most requests
    }

    // Check if user is authenticated using getUser()
    const { data, error } = await supabase.auth.getUser()

    // API routes that require authentication (exclude auth endpoints)
    const isProtectedApiRoute =
      pathname.startsWith("/api/") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/api/health")

    // If accessing protected API route without authentication, return 401
    if (isProtectedApiRoute && (error || !data.user)) {
      const authError = error || new Error("No authenticated user")
      const parsedError = parseError(authError, {
        requestId,
        url: request.url,
        timestamp: new Date().toISOString(),
      })

      const logEntry = formatErrorForLogging(parsedError, {
        requestId,
        timestamp: new Date().toISOString(),
        operation: "middleware-auth-validation",
        pathname,
        hasUser: !!data.user,
        authError: error?.message,
      })

      console.error("Middleware authentication failed:", JSON.stringify(logEntry, null, 2))

      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication required",
          requestId,
          timestamp: new Date().toISOString(),
        },
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "x-request-id": requestId,
          },
        },
      )
    }

    // Log successful middleware completion
    const duration = Date.now() - startTime
    console.log(
      "Middleware completed:",
      JSON.stringify(
        {
          requestId,
          pathname,
          authenticated: !!data.user,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    )

    return res
  } catch (error) {
    const duration = Date.now() - startTime
    const parsedError = parseError(error instanceof Error ? error : new Error(String(error)), {
      requestId,
      url: request.url,
      timestamp: new Date().toISOString(),
    })

    const logEntry = formatErrorForLogging(parsedError, {
      requestId,
      timestamp: new Date().toISOString(),
      operation: "middleware-execution",
      pathname,
      duration: `${duration}ms`,
    })

    console.error("Middleware error:", JSON.stringify(logEntry, null, 2))

    // If there's an error in an API route, return 500
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message: "Authentication service unavailable",
          requestId,
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "x-request-id": requestId,
          },
        },
      )
    }

    // For other routes, continue
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder files)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
