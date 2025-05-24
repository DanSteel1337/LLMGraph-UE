/**
 * Authentication Utilities
 *
 * Single source of truth for all authentication in the application.
 * Provides both client and server-side authentication functions.
 *
 * IMPORTANT: API routes must use relative imports (../../../lib/auth)
 * for Edge Runtime compatibility.
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { User } from "@supabase/supabase-js"
import type { Database } from "../types/supabase"

// ======== Environment Validation ========

/**
 * Validates that required environment variables are present
 */
function validateEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

// ======== Client-Side Authentication ========

// Singleton browser client
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Gets the Supabase client for browser use
 * ONLY use in client components or client-side code
 */
export function getSupabaseClient() {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseClient can only be called in client-side code")
  }

  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = validateEnv()
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
    console.log("[AUTH] Browser client initialized")
  }

  return browserClient
}

/**
 * Signs in with email and password
 * ONLY use in client components
 */
export async function signIn(email: string, password: string) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error("[AUTH] Sign in error:", error.message)
      return { user: null, error }
    }

    console.log("[AUTH] User signed in:", data.user?.email)
    return { user: data.user, error: null }
  } catch (error) {
    console.error("[AUTH] Sign in exception:", error)
    return {
      user: null,
      error: error instanceof Error ? error : new Error("Unknown sign in error"),
    }
  }
}

/**
 * Signs out the current user
 * ONLY use in client components
 */
export async function signOut() {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("[AUTH] Sign out error:", error.message)
      return { error }
    }

    console.log("[AUTH] User signed out")
    return { error: null }
  } catch (error) {
    console.error("[AUTH] Sign out exception:", error)
    return {
      error: error instanceof Error ? error : new Error("Unknown sign out error"),
    }
  }
}

/**
 * Gets the current user from the client
 * ONLY use in client components
 */
export async function getCurrentUser() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("[AUTH] Get current user error:", error.message)
      return { user: null, error }
    }

    return { user: data.user, error: null }
  } catch (error) {
    console.error("[AUTH] Get current user exception:", error)
    return {
      user: null,
      error: error instanceof Error ? error : new Error("Unknown get user error"),
    }
  }
}

// ======== Server-Side Authentication ========

/**
 * Gets the Supabase client for server use
 * ONLY use in server components or API routes
 */
export async function getSupabaseServer() {
  try {
    const { supabaseUrl, supabaseAnonKey } = validateEnv()
    const cookieStore = cookies()

    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // This happens in middleware or when headers are already sent
            console.warn("[AUTH] Could not set cookie:", name, error)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 })
          } catch (error) {
            // This happens in middleware or when headers are already sent
            console.warn("[AUTH] Could not remove cookie:", name, error)
          }
        },
      },
    })
  } catch (error) {
    console.error("[AUTH] Server client error:", error)
    throw error
  }
}

/**
 * Requires authentication, throws if not authenticated
 * Use in API routes that require authentication
 */
export async function requireAuth(): Promise<User> {
  try {
    const supabase = await getSupabaseServer()
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.error("[AUTH] Authentication error:", error.message)
      throw new Error(`Authentication failed: ${error.message}`)
    }

    if (!data.user) {
      console.warn("[AUTH] No user found in session")
      throw new Error("No authenticated user found")
    }

    return data.user
  } catch (error) {
    console.error("[AUTH] Authentication exception:", error)
    throw error instanceof Error ? error : new Error("Unknown authentication error")
  }
}

// ======== Helper Functions ========

/**
 * Gets a user-friendly display name (internal helper)
 */
function getUserDisplayName(user: User | null): string {
  if (!user) return "Guest"
  return user.email?.split("@")[0] || user.id.substring(0, 8)
}
