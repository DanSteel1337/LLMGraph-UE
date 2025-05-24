"use client"

import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabaseClient, getCurrentUser } from "@/lib/auth"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    getCurrentUser()
      .then(setUser)
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

  return { user, loading }
}
