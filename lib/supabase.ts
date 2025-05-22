/**
 * FINALIZED AUTHENTICATION SYSTEM - DO NOT MODIFY
 *
 * This file provides ONLY the browser client for client components.
 * Server clients are in separate files to avoid Next.js build conflicts.
 *
 * Enhanced version with better error handling and cleanup
 */

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

// Consistent storage key across all environments
const STORAGE_KEY = "supabase-auth"

// Global singleton instance
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Gets the browser Supabase client (singleton)
 * This implementation ensures only one client is created per browser context
 */
export function getBrowserClient() {
  // Server-side check - always return null on server
  if (typeof window === "undefined") {
    return null
  }

  // Return existing instance if available
  if (browserClient !== null) {
    return browserClient
  }

  // Create new instance if none exists
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: STORAGE_KEY,
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  )

  return browserClient
}

// Cleanup function for testing or development
export function resetBrowserClient() {
  if (typeof window !== "undefined") {
    browserClient = null
  }
}
