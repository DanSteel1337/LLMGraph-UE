"use client"

import type React from "react"
import { useEffect } from "react"
import { Header } from "../components/layout/header"
import { Sidebar } from "../components/layout/sidebar"
import { useProtectedRoute, resetNavigationState, AuthGuardLoading } from "../../lib/route-guards"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ✅ RESET NAVIGATION STATE - Prevents stale redirects
  useEffect(() => {
    resetNavigationState()
    console.log("[DASHBOARD] Navigation state reset")
  }, [])

  // ✅ PROTECTED ROUTE GUARD - Handles auth check and redirects
  const { shouldRender, isLoading, user } = useProtectedRoute("/auth/login")

  // ✅ LOADING STATE - Clean UX during auth check
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // ✅ AUTH CHECK - Don't render if not authenticated
  if (!shouldRender) {
    return <AuthGuardLoading />
  }

  // ✅ RENDER DASHBOARD - Only when authenticated
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {/* ✅ DEV INFO - Only in development */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-500">
              <p>
                <strong>User:</strong> {user?.email || "Not authenticated"}
              </p>
              <p>
                <strong>Auth:</strong> Protected route active
              </p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
