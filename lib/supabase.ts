/**
 * Purpose: Supabase client for browser
 * Logic:
 * - Creates and exports a Supabase client for browser usage
 * - Implements singleton pattern to avoid multiple instances
 * Runtime context: Browser
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
