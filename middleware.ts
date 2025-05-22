/**
 * FINALIZED AUTHENTICATION SYSTEM - DO NOT MODIFY
 *
 * This middleware protects API routes by validating authentication.
 * Enhanced version with better error handling and performance.
 *
 * See docs/AUTH_LOCKED.md for details on why this implementation works
 * and why it should not be modified.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Consistent storage key across all environments
const STORAGE_KEY = "supabase-auth"

// Cache for environment variables
const ENV_CACHE = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

export async function middleware(request: NextRequest) {
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
    // Create response to modify
    const res = NextResponse.next()

    // Validate environment variables
    if (!ENV_CACHE.url || !ENV_CACHE.key) {
      console.error("Missing Supabase environment variables")
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Configuration error" }, { status: 500 })
      }
      return res
    }

    // Create a Supabase client
    const supabase = createServerClient(
      ENV_CACHE.url,
      ENV_CACHE.key,
      {
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
      },
    )

    // Check if user is authenticated using getUser()
    const { data, error } = await supabase.auth.getUser()

    // API routes that require authentication (exclude auth endpoints)
    const isProtectedApiRoute = pathname.startsWith("/api/") && 
                               !pathname.startsWith("/api/auth") &&
                               !pathname.startsWith("/api/health")

    // If accessing protected API route without authentication, return 401
    if (isProtectedApiRoute && (error || !data.user)) {
      return NextResponse.json(
        { 
          error: "Unauthorized",
          message: "Authentication required" 
        }, 
        { 
          status: 401,
          headers: {
            "Content-Type": "application/json",
          }
        }
      )
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)

    // If there's an error in an API route, return 500
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { 
          error: "Internal Server Error",
          message: "Authentication service unavailable"
        }, 
        { 
          status: 500,
          headers: {
            "Content-Type": "application/json",
          }
        }
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
