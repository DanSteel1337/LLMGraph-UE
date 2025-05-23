"use client"

import type React from "react"

import { useAuth } from "@/app/components/auth/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Header } from "@/app/components/layout/header"
import { Sidebar } from "@/app/components/layout/sidebar"
import { ErrorBoundary, useErrorBoundaryWithToast } from "@/app/components/ui/error-boundary"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { handleError } = useErrorBoundaryWithToast()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  // Show nothing while loading or if not authenticated
  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  return (
    <ErrorBoundary
      onError={(error) => handleError(error)}
      showSourceMaps={process.env.NODE_ENV === "development"}
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="p-6 flex flex-col items-center justify-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">Dashboard Error</h3>
            <p className="text-muted-foreground text-center mb-6">
              An error occurred while loading the dashboard. Please try again or refresh the page.
            </p>
            <Button onClick={() => window.location.reload()} variant="default">
              Refresh Page
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex h-screen flex-col">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4">
            <ErrorBoundary
              onError={(error) => handleError(error)}
              showSourceMaps={process.env.NODE_ENV === "development"}
            >
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
