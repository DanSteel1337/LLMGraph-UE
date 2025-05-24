"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../components/auth/auth-provider"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Simple redirect for single-user access
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Show loading while checking auth
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  // Show login if not authenticated
  if (user) {
    return <div className="flex h-screen items-center justify-center">Redirecting...</div>
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/50">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
