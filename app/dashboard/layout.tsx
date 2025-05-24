"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../lib/auth-client"
import { Header } from "../components/layout/header"
import { Sidebar } from "../components/layout/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, isInitialized } = useAuth()
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // Only redirect once when fully initialized and no user
    if (isInitialized && !loading && !user && !hasRedirected) {
      setHasRedirected(true)
      router.replace("/auth/login")
    }
  }, [isInitialized, loading, user, hasRedirected, router])

  // Show loading while checking auth
  if (!isInitialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if no user
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">{children}</main>
      </div>
    </div>
  )
}
