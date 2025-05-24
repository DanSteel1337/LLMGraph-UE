"use client"

import { createBrowserClient } from "@supabase/ssr"
import { useEffect } from "react"
import { useAuth as useAuthSingleton } from "./auth-singleton"

let browserClient: ReturnType<typeof createBrowserClient> | null = null

/**
 * Singleton browser client for client-side auth
 */
function getBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("getBrowserClient can only be called on the client side")
  }

  if (!browserClient) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase environment variables")
    }

    browserClient = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  }

  return browserClient
}

/**
 * Client-side auth hook - Single source of truth for React components
 * MUST be used in ALL client components that need auth - no other auth hooks allowed
 * @deprecated Use useAuth from lib/auth-singleton instead
 * This is kept for backward compatibility only
 */
export function useAuth() {
  useEffect(() => {
    console.warn(
      "DEPRECATED: useAuth() from lib/auth-client.ts is deprecated. " +
        "Use useAuth() from lib/auth-singleton.ts instead.",
    )
  }, [])

  // Forward to the new singleton implementation
  return useAuthSingleton()
}
