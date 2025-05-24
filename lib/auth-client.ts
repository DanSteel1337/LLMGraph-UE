"use client"

import { createBrowserClient } from "@supabase/ssr"
import { useState, useEffect, useCallback, useRef } from "react"
import type { User } from "@supabase/supabase-js"

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
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const initRef = useRef(false)
  const redirectRef = useRef(false)

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const supabase = getBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      if (data.user) {
        setUser(data.user)
      }

      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err : new Error("Unknown error") }
    }
  }, [])

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      const supabase = getBrowserClient()
      await supabase.auth.signOut()
      setUser(null)
      redirectRef.current = false
      window.location.href = "/auth/login"
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }, [])

  // Initialize auth state and listeners
  useEffect(() => {
    if (typeof window === "undefined" || initRef.current) return

    initRef.current = true

    const initializeAuth = async () => {
      try {
        const supabase = getBrowserClient()

        // Get initial session
        const {
          data: { user: initialUser },
        } = await supabase.auth.getUser()

        setUser(initialUser)
        setIsInitialized(true)
        setLoading(false)
      } catch (error) {
        console.error("Auth initialization error:", error)
        setUser(null)
        setIsInitialized(true)
        setLoading(false)
      }
    }

    // Set up auth state listener
    const supabase = getBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      // Prevent multiple redirects
      if (event === "SIGNED_IN" && !redirectRef.current) {
        redirectRef.current = true
        window.location.href = "/dashboard"
      } else if (event === "SIGNED_OUT" && !redirectRef.current) {
        redirectRef.current = true
        window.location.href = "/auth/login"
      }
    })

    initializeAuth()

    return () => {
      subscription.unsubscribe()
      initRef.current = false
    }
  }, [])

  return {
    user,
    loading,
    signIn,
    signOut,
    isInitialized,
  }
}
