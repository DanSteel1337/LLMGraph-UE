"use client"

import type React from "react"
import { useAuth } from "../../lib/hooks/use-auth"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If authenticated, redirect to dashboard
    if (user && !isLoading) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If authenticated, will redirect to dashboard
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Redirecting to dashboard...</span>
      </div>
    )
  }

  // Show login form
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">LLMGraph-UE</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>
        {children}
      </div>
    </div>
  )
}
