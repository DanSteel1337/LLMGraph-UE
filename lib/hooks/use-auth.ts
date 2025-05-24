"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabaseClient, getCurrentUser, signIn as authSignIn, signOut as authSignOut } from "@/lib/auth"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    getCurrentUser()
      .then(({ user }) => setUser(user))
      .finally(() => setLoading(false))

    // Listen for auth changes
    const supabase = getSupabaseClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    return authSignIn(email, password)
  }

  const signOut = async () => {
    return authSignOut()
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signOut,
  }
}
