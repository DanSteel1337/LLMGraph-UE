/**
 * Client-side Authentication Utilities
 *
 * This file contains authentication functions that can be used on the client
 * (React components, client-side code).
 *
 * These functions do not require server-side cookies and are safe to use in the browser.
 */

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

// Singleton browser client
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Gets or creates a Supabase client for browser use
 * ONLY use in client components or client-side code
 */
export function getSupabaseClient() {
  if (!browserClient) {
    // Check for environment variables only when the function is called
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL")
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }

    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  }
  return browserClient
}

/**
 * Signs in a user with email and password
 * ONLY use in client components
 *
 * @returns Object with user data or error
 */
export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient()
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Signs out the current user
 * ONLY use in client components
 *
 * @returns Object with error if sign out failed
 */
export async function signOut() {
  const supabase = getSupabaseClient()
  return supabase.auth.signOut()
}

/**
 * Gets the current authenticated user
 * ONLY use in client components
 *
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const supabase = getSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}
