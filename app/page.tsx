"use client"

import { Button } from "../components/ui/button"
import Link from "next/link"
import { usePublicRoute, AuthGuardLoading, resetNavigationState } from "../lib/route-guards"
import { useEffect } from "react"

export default function LandingPage() {
  // ✅ USE PUBLIC ROUTE GUARD - Handles all auth logic safely
  const { shouldRender, isLoading, user, navigate } = usePublicRoute("/dashboard")

  // ✅ RESET NAVIGATION STATE ON MOUNT - Prevents stale redirects
  useEffect(() => {
    resetNavigationState()
    console.log("[LANDING] Page mounted, navigation state reset")
  }, []) // ✅ NO DEPENDENCIES - Runs once only

  // ✅ LOADING STATE - Show while checking auth
  if (isLoading) {
    console.log("[LANDING] Loading auth state...")
    return <AuthGuardLoading />
  }

  // ✅ AUTHENTICATED USER - Route guard handles redirect
  if (!shouldRender) {
    console.log("[LANDING] User authenticated, route guard handling redirect")
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // ✅ UNAUTHENTICATED USER - Show landing page
  console.log("[LANDING] Showing landing page for unauthenticated user")

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* ✅ HEADER SECTION */}
          <div className="space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">LLMGraph-UE</h1>
            <p className="text-xl text-gray-600">Serverless RAG Dashboard</p>
            <p className="text-lg text-gray-500">for UE5.4 API Documentation</p>
          </div>

          {/* ✅ FEATURES SECTION */}
          <div className="space-y-4">
            <div className="grid gap-4 text-left">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload Documents</p>
                  <p className="text-sm text-gray-500">PDF, Markdown, and HTML support</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">AI Processing</p>
                  <p className="text-sm text-gray-500">Semantic chunking and embeddings</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Vector Search</p>
                  <p className="text-sm text-gray-500">Advanced RAG with Pinecone</p>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ CTA SECTION */}
          <div className="space-y-4">
            <Button asChild size="lg" className="w-full h-12 text-lg">
              <Link href="/auth/login">Get Started</Link>
            </Button>

            <p className="text-xs text-gray-400">Powered by Next.js 15, OpenAI GPT-4o, and Pinecone</p>
          </div>

          {/* ✅ DEBUG INFO (only in development) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left">
              <p className="text-xs font-mono text-gray-600">
                Debug: Landing page rendered
                <br />
                User: {user ? user.email : "None"}
                <br />
                Should render: {shouldRender.toString()}
                <br />
                Loading: {isLoading.toString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
