/**
 * FINALIZED AUTHENTICATION SYSTEM - DO NOT MODIFY
 *
 * This file is the single source of truth for all Supabase clients.
 * It implements the singleton pattern for each environment to prevent
 * the "Multiple GoTrueClient instances" warning.
 *
 * See docs/AUTH_LOCKED.md for details on why this implementation works
 * and why it should not be modified.
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { cache } from "react"
import type { Database } from "@/types/supabase"

// Consistent storage key across all environments
const STORAGE_KEY = "supabase-auth"

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
      },
    },
  )
}

// Browser client (singleton using module scope)
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getBrowserClient() {
  if (typeof window === "undefined") return null

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: STORAGE_KEY,
          flowType: "pkce",
        },
      },
    )
  }

  return browserClient
}
