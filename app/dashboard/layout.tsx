"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
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
  const hasRedirectedRef = useRef(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Only redirect once when fully initialized and no user
    if (isInitialized && !loading && !user && !hasRedirectedRef.current && !isRedirecting) {
      hasRedirectedRef.current = true
      setIsRedirecting(true)

      // Use replace to avoid history issues
      router.replace("/auth/login")
    }
  }, [isInitialized, loading, user]) // ❌ REMOVED router from dependencies

  // Show loading while checking auth or redirecting
  if (!isInitialized || loading || isRedirecting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">{isRedirecting ? "Redirecting..." : "Loading..."}</p>
        </div>
      </div>
    )
  }

  // Don't render dashboard if no user
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
