"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabaseClient, getCurrentUser } from "@/lib/auth-client"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Get initial user
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (err) {
        console.error("Error fetching user:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Set up auth listener
    let subscription: { unsubscribe: () => void } | null = null

    try {
      const supabase = getSupabaseClient()
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
      subscription = data.subscription
    } catch (err) {
      console.error("Error setting up auth listener:", err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setLoading(false)
    }

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  return { user, loading, error }
}
