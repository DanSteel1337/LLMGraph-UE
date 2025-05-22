/**
 * FINALIZED AUTHENTICATION SYSTEM - DO NOT MODIFY
 *
 * This component provides authentication context to the entire application.
 * Enhanced version with better singleton handling and cleanup.
 *
 * See docs/AUTH_LOCKED.md for details on why this implementation works
 * and why it should not be modified.
 */

"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { getBrowserClient } from "@/lib/supabase"
import type { User, AuthError } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  isInitialized: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()
  const initRef = useRef(false)

  // Get the Supabase client once and memoize it
  const supabase = getBrowserClient()

  // Sign in function
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error("Supabase client not initialized") }

    try {
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
  }, [supabase])

  // Sign out function
  const signOut = useCallback(async () => {
    if (!supabase) return

    try {
      await supabase.auth.signOut()
      setUser(null)
      router.push("/auth/login")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }, [supabase, router])

  // Initialize auth state and listeners
  useEffect(() => {
    if (!supabase || initRef.current) return

    initRef.current = true

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { user: initialUser } } = await supabase.auth.getUser()
        setUser(initialUser)
        setIsInitialized(true)
      } catch (error) {
        console.error("Auth initialization error:", error)
        setUser(null)
        setIsInitialized(true)
      } finally {
        setLoading(false)
      }
    }

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        router.refresh()
      }
    })

    initializeAuth()

    return () => {
      subscription.unsubscribe()
      initRef.current = false
    }
  }, [supabase, router])

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isInitialized,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
