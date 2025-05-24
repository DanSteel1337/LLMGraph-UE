import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

// Environment validation
const requiredEnvs = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
] as const

requiredEnvs.forEach(env => {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`)
  }
})

// Simple singleton for browser
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}

// Simple server client for API routes and server components
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
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Ignore errors from server components
          }
        },
      },
    }
  )
}

// Simple auth check for API routes - throws if unauthorized
export async function requireAuth() {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data?.user) {
    throw new Error('Unauthorized')
  }
  
  return data.user
}

// Simple sign in
export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient()
  return supabase.auth.signInWithPassword({ email, password })
}

// Simple sign out
export async function signOut() {
  const supabase = getSupabaseClient()
  return supabase.auth.signOut()
}

// Get current user (client-side)
export async function getCurrentUser() {
  const supabase = getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
