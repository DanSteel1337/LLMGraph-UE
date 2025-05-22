/**
 * FINALIZED AUTHENTICATION SYSTEM - DO NOT MODIFY
 *
 * This file is the single source of truth for all Supabase clients.
 * It implements the singleton pattern for each environment to prevent
 * the "Multiple GoTrueClient instances" warning.
 *
 * Enhanced version with better error handling and cleanup
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { cache } from "react"
import type { Database } from "@/types/supabase"

// Consistent storage key across all environments
const STORAGE_KEY = "supabase-auth"

// Global flag to prevent multiple browser client instances
let browserClientInitialized = false

// Server-side client (singleton using React cache)
export const createClient = cache(() => {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignore errors in Edge Runtime
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch {
            // Ignore errors in Edge Runtime
          }
        },
      },
      auth: {
        storageKey: STORAGE_KEY,
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    },
  )
})

// Edge runtime client (for API routes)
export function createEdgeClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Ignore errors in Edge Runtime
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch {
            // Ignore errors in Edge Runtime
          }
        },
      },
      auth: {
        storageKey: STORAGE_KEY,
        flowType: "pkce",
        autoRefreshToken: false, // Don't auto-refresh in API routes
        persistSession: false,   // Don't persist in API routes
        detectSessionInUrl: false,
      },
    },
  )
}

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
