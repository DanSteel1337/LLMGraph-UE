/**
 * Server-side Authentication Utilities
 *
 * This file contains authentication functions that can only be used on the server
 * (API routes, server components) as they require access to cookies.
 *
 * IMPORTANT: API routes must use relative imports for Edge Runtime compatibility.
 */

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

// Environment validation
const requiredEnvs = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const

requiredEnvs.forEach((env) => {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`)
  }
})

/**
 * Creates a Supabase client for server-side use
 * ONLY use in server components or API routes
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignore errors from server components
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch {
            // Ignore errors from server components
          }
        },
      },
    },
  )
}

/**
 * Requires authentication for API routes
 * Throws an error if the user is not authenticated
 *
 * Usage in API routes:
 * ```
 * try {
 *   const user = await requireAuth()
 *   // ... authenticated logic
 * } catch (error) {
 *   return new Response(
 *     JSON.stringify({ error: "Unauthorized" }),
 *     { status: 401, headers: { "Content-Type": "application/json" } }
 *   )
 * }
 * ```
 */
export async function requireAuth() {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    throw new Error("Unauthorized")
  }

  return data.user
}
