/**
 * FINALIZED AUTHENTICATION SYSTEM - DO NOT MODIFY
 *
 * This middleware protects API routes by validating authentication.
 * It uses the same storage key and configuration as the rest of the auth system.
 *
 * See docs/AUTH_LOCKED.md for details on why this implementation works
 * and why it should not be modified.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Consistent storage key across all environments
const STORAGE_KEY = "supabase-auth"

export async function middleware(request: NextRequest) {
  try {
    // Create response to modify
    const res = NextResponse.next()

    // Create a Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
        },
      },
    )

    // Check if user is authenticated using getUser()
    const { data } = await supabase.auth.getUser()

    // API routes that require authentication
    const isApiRoute = request.nextUrl.pathname.startsWith("/api/") && !request.nextUrl.pathname.startsWith("/api/auth")

    // If accessing API route without authentication, return 401
    if (isApiRoute && !data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return res
  } catch (error) {
    console.error("Middleware error:", error)

    // If there's an error in an API route, return 500
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }

    // For other routes, continue
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/api/:path*"],
}
