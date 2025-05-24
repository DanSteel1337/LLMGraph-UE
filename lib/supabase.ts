/**
 * Supabase Browser Client
 *
 * Purpose: Minimal browser-side Supabase client for single-user authentication
 * Features: Email/password authentication only
 * Usage: Client components and browser-side operations
 */

import { createBrowserClient } from "@supabase/ssr"

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (browserClient) {
    return browserClient
  }

  if (typeof window === "undefined") {
    throw new Error("getBrowserClient should only be called in browser context")
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase environment variables")
  }

  browserClient = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  return browserClient
}

// Also export as createClient for compatibility
export function createClient() {
  return getBrowserClient()
}
