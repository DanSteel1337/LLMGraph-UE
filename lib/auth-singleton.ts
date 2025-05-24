"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"

// ✅ GLOBAL SINGLETON STATE - Prevents multiple initializations
let authClient: ReturnType<typeof createBrowserClient> | null = null
let currentUser: User | null = null
let isGloballyInitialized = false
let authSubscribers: Array<(user: User | null, loading: boolean) => void> = []
let isLoading = true

// ✅ SINGLETON CLIENT - Only one instance ever created
function getAuthClient() {
  if (typeof window === "undefined") return null

  if (!authClient) {
    authClient = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    // ✅ SINGLE AUTH LISTENER - No redirects, just state updates
    authClient.auth.onAuthStateChange(async (event, session) => {
      console.log("[AUTH] State change:", event, session?.user?.email || "no user")

      currentUser = session?.user ?? null
      isLoading = false

      // ✅ NOTIFY ALL SUBSCRIBERS - No redirects here
      notifyAllSubscribers()
    })

    // ✅ INITIALIZE ONCE
    initializeAuth()
  }

  return authClient
}

// ✅ INITIALIZE AUTH STATE - FIXED TO HANDLE MISSING SESSION GRACEFULLY
async function initializeAuth() {
  if (isGloballyInitialized) return

  try {
    const client = getAuthClient()
    if (!client) return

    // Get current session state
    const { data, error } = await client.auth.getSession()

    // ✅ FIX: Don't treat missing session as an error
    if (error) {
      console.warn("[AUTH] Session retrieval warning:", error.message)
      // Continue initialization with null user
    }

    // Set user from session (if exists)
    currentUser = data?.session?.user ?? null

    // ✅ FIX: Always mark as initialized, even with no user
    isGloballyInitialized = true
    isLoading = false

    console.log("[AUTH] Initialized with user:", currentUser?.email || "no user")
    notifyAllSubscribers()
  } catch (error) {
    console.error("[AUTH] Fatal initialization error:", error)

    // ✅ FIX: Still mark as initialized to prevent loops
    isGloballyInitialized = true
    isLoading = false
    notifyAllSubscribers()
  }
}

// ✅ NOTIFY SUBSCRIBERS - Central state management
function notifyAllSubscribers() {
  authSubscribers.forEach((callback) => {
    try {
      callback(currentUser, isLoading)
    } catch (error) {
      console.error("[AUTH] Subscriber error:", error)
    }
  })
}

// ✅ MAIN AUTH HOOK - No redirects, just state
export function useAuth() {
  const [user, setUser] = useState<User | null>(currentUser)
  const [loading, setLoading] = useState(isLoading)

  useEffect(() => {
    // ✅ SUBSCRIBE TO AUTH CHANGES
    const handleAuthChange = (newUser: User | null, newLoading: boolean) => {
      setUser(newUser)
      setLoading(newLoading)
    }

    authSubscribers.push(handleAuthChange)

    // ✅ INITIALIZE CLIENT IF NEEDED
    getAuthClient()

    // ✅ SET CURRENT STATE
    if (isGloballyInitialized) {
      setUser(currentUser)
      setLoading(false)
    }

    // ✅ CLEANUP SUBSCRIPTION
    return () => {
      authSubscribers = authSubscribers.filter((sub) => sub !== handleAuthChange)
    }
  }, []) // ✅ NO DEPENDENCIES - Prevents loops

  // ✅ SIGN IN FUNCTION
  const signIn = async (email: string, password: string) => {
    const client = getAuthClient()
    if (!client) return { error: new Error("Auth client not available") }

    try {
      const { error } = await client.auth.signInWithPassword({ email, password })
      return { error }
    } catch (error) {
      console.error("[AUTH] Sign in error:", error)
      return { error: error as Error }
    }
  }

  // ✅ SIGN OUT FUNCTION
  const signOut = async () => {
    const client = getAuthClient()
    if (!client) return

    try {
      await client.auth.signOut()
      // ✅ NO AUTOMATIC REDIRECT - Let components handle this
    } catch (error) {
      console.error("[AUTH] Sign out error:", error)
    }
  }

  return {
    user,
    loading,
    signIn,
    signOut,
    isInitialized: isGloballyInitialized,
  }
}

// ✅ DIRECT AUTH STATE ACCESS - For debugging
export function getAuthState() {
  return {
    user: currentUser,
    loading: isLoading,
    initialized: isGloballyInitialized,
    subscriberCount: authSubscribers.length,
  }
}
