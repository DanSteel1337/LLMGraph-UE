"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../components/ui/button"
import Link from "next/link"
import { useAuth } from "../lib/auth-client"

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard")
    }
  }, [user, loading, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Only show landing page if not authenticated
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">LLMGraph-UE</h1>
            <p className="text-lg text-muted-foreground">Serverless RAG dashboard for UE5.4 API documentation</p>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload documents, process them with AI, and chat with your documentation using advanced vector search.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/auth/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
