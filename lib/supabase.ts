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

// Global flag to prevent multiple browser client instances
let browserClientInitialized = false

// Browser client (singleton using module scope with enhanced protection)
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getBrowserClient() {
  // Server-side check
  if (typeof window === "undefined") return null

  // Prevent multiple instances
  if (browserClient && browserClientInitialized) {
    return browserClient
  }

  if (!browserClientInitialized) {
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
    
    browserClientInitialized = true
  }

  return browserClient
}

// Cleanup function for testing or development
export function resetBrowserClient() {
  if (typeof window !== "undefined") {
    browserClient = null
    browserClientInitialized = false
  }
}
