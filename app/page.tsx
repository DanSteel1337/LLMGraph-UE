"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/app/components/auth/auth-provider"

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Show nothing while loading
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  // Only show landing page if not authenticated
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <h1 className="text-4xl font-bold">LLMGraph-UE</h1>
          <p className="text-lg text-muted-foreground">A serverless RAG dashboard for API documentation</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/auth/login">Get Started</Link>
          </Button>
        </div>
      </div>
    )
  }

  return null
}
